import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDb, getDocumentBucket, ensureDbInitialized } from "../../../../../db";
import { paperAnalyses, uploadedDocuments } from "../../../../../db/schema";
import { analyzePdfDocument } from "../../../../../lib/research-provider";
import { extractPdfText, PdfProcessingError } from "../../../../../lib/pdf-parser";
import { writeAuditEvent } from "../../../../../lib/audit";

const ANALYSIS_TIMEOUT_MS = 45_000;

type DocumentStatus = "uploaded" | "queued" | "processing" | "extracted" | "ocr_required" | "completed" | "failed" | "rejected";

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Document analysis timed out.")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function setDocumentStatus(
  documentId: string,
  ownerId: string,
  status: DocumentStatus,
  details: { extractionError?: string | null; pageCount?: number | null; extractedAt?: Date | null } = {},
) {
  await getDb().update(uploadedDocuments).set({
    processingStatus: status,
    extractionError: details.extractionError ?? null,
    pageCount: details.pageCount,
    extractedAt: details.extractedAt,
  }).where(and(eq(uploadedDocuments.id, documentId), eq(uploadedDocuments.ownerId, ownerId)));
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to analyze a document." }, { status: 401 });
  const { id } = await context.params;

  try {
    await ensureDbInitialized();
    const [document] = await getDb().select().from(uploadedDocuments)
      .where(and(eq(uploadedDocuments.id, id), eq(uploadedDocuments.ownerId, user.userId))).limit(1);
    if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });

    const object = await getDocumentBucket().get(document.storageKey);
    if (!object) {
      await setDocumentStatus(id, user.userId, "failed", { extractionError: "Document object is unavailable." });
      return NextResponse.json({ error: "Document object is unavailable." }, { status: 404 });
    }

    await setDocumentStatus(id, user.userId, "processing");
    const bytes = await object.arrayBuffer();
    let extracted;
    try {
      extracted = extractPdfText(bytes);
    } catch (error) {
      const message = error instanceof PdfProcessingError ? error.message : "PDF extraction failed.";
      await setDocumentStatus(id, user.userId, "failed", { extractionError: message });
      return NextResponse.json({ error: message }, { status: 422 });
    }

    if (!extracted.text) {
      await setDocumentStatus(id, user.userId, "ocr_required", {
        extractionError: "No machine-readable text was found. OCR processing is required before appraisal.",
        pageCount: extracted.pageCount,
      });
      return NextResponse.json({
        error: "No machine-readable text was found. OCR processing is required before appraisal.",
        status: "ocr_required",
        pageCount: extracted.pageCount,
      }, { status: 422 });
    }

    const extractedAt = new Date();
    await setDocumentStatus(id, user.userId, "extracted", { pageCount: extracted.pageCount, extractedAt });
    const analysis = await withTimeout(analyzePdfDocument(document.originalName, bytes), ANALYSIS_TIMEOUT_MS);
    if (!analysis) {
      await setDocumentStatus(id, user.userId, "failed", { extractionError: "No analysis was produced." });
      return NextResponse.json({ error: "No analysis was produced. No analysis was saved." }, { status: 503 });
    }

    const now = new Date();
    await getDb().batch([
      getDb().insert(paperAnalyses).values({
        id: crypto.randomUUID(),
        documentId: id,
        ownerId: user.userId,
        content: analysis,
        model: "configured-provider-or-deterministic-extraction",
        createdAt: now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: paperAnalyses.documentId,
        set: { content: analysis, model: "configured-provider-or-deterministic-extraction", updatedAt: now },
      }),
      getDb().update(uploadedDocuments).set({
        processingStatus: "completed",
        extractionError: null,
        pageCount: extracted.pageCount,
        extractedAt,
      }).where(and(eq(uploadedDocuments.id, id), eq(uploadedDocuments.ownerId, user.userId))),
    ]);
    try { await writeAuditEvent(user.userId, "analyzed", "document", id); } catch { /* preserve successful analysis */ }
    return NextResponse.json({
      documentId: id,
      analysis,
      status: "completed",
      pageCount: extracted.pageCount,
      sourceWarning: "This analysis is derived from the uploaded document. Verify every claim against the original paper and page provenance.",
    });
  } catch (error) {
    try {
      await ensureDbInitialized();
      await setDocumentStatus(id, user.userId, "failed", { extractionError: error instanceof Error ? error.message : "Document analysis failed." });
    } catch {
      // Preserve the original failure response if status persistence is unavailable.
    }
    return NextResponse.json({ error: "Document analysis is unavailable. No analysis was saved." }, { status: 503 });
  }
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to view an analysis." }, { status: 401 });
  const { id } = await context.params;
  try {
    await ensureDbInitialized();
    const [analysis] = await getDb().select({ content: paperAnalyses.content, model: paperAnalyses.model, updatedAt: paperAnalyses.updatedAt })
      .from(paperAnalyses).where(and(eq(paperAnalyses.documentId, id), eq(paperAnalyses.ownerId, user.userId))).limit(1);
    if (!analysis) return NextResponse.json({ error: "No saved analysis exists for this document." }, { status: 404 });
    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json({ error: "Analysis storage is unavailable." }, { status: 503 });
  }
}
