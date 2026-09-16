import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb, getDocumentBucket, ensureDbInitialized } from "../../../db";
import { uploadedDocuments } from "../../../db/schema";
import { desc, eq, and } from "drizzle-orm";
import { writeAuditEvent } from "../../../lib/audit";
import { inspectPdfBytes, MAX_PDF_BYTES } from "../../../lib/pdf-parser";

function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180) || "document.pdf";
}

function documentResponse(document: {
  id: string;
  originalName: string;
  byteSize: number;
  processingStatus: string;
  extractionError?: string | null;
  pageCount?: number | null;
  extractedAt?: Date | null;
  createdAt?: Date;
}) {
  return {
    id: document.id,
    originalName: document.originalName,
    byteSize: document.byteSize,
    processingStatus: document.processingStatus,
    extractionError: document.extractionError ?? null,
    pageCount: document.pageCount ?? null,
    extractedAt: document.extractedAt ?? null,
    createdAt: document.createdAt,
  };
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to view documents." }, { status: 401 });
  try {
    await ensureDbInitialized();
    const documents = await getDb().select({
      id: uploadedDocuments.id,
      originalName: uploadedDocuments.originalName,
      byteSize: uploadedDocuments.byteSize,
      processingStatus: uploadedDocuments.processingStatus,
      extractionError: uploadedDocuments.extractionError,
      pageCount: uploadedDocuments.pageCount,
      extractedAt: uploadedDocuments.extractedAt,
      createdAt: uploadedDocuments.createdAt,
    }).from(uploadedDocuments).where(eq(uploadedDocuments.ownerId, user.userId))
      .orderBy(desc(uploadedDocuments.createdAt)).limit(50);
    return NextResponse.json({ documents });
  } catch {
    return NextResponse.json({ error: "Document storage is unavailable." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to delete documents." }, { status: 401 });
  const url = new URL(request.url);
  const idFromQuery = url.searchParams.get("id");
  const body = request.method === "DELETE" && !idFromQuery ? await request.json().catch(() => null) as { id?: string } | null : null;
  const id = idFromQuery || body?.id;
  if (!id) return NextResponse.json({ error: "Provide document id to delete." }, { status: 400 });

  try {
    await ensureDbInitialized();
    const [doc] = await getDb().select().from(uploadedDocuments)
      .where(and(eq(uploadedDocuments.id, id), eq(uploadedDocuments.ownerId, user.userId))).limit(1);
    if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

    try { await getDocumentBucket().delete(doc.storageKey); } catch { /* ignore if already gone */ }
    await getDb().delete(uploadedDocuments).where(and(eq(uploadedDocuments.id, id), eq(uploadedDocuments.ownerId, user.userId)));
    try { await writeAuditEvent(user.userId, "deleted", "document", id); } catch { /* preserve delete */ }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete document." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload a document." }, { status: 401 });
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF file to upload." }, { status: 400 });
  if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF documents are accepted." }, { status: 415 });
  }
  if (file.size === 0 || file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF files must be between 1 byte and 25 MB." }, { status: 413 });
  }

  const bytes = await file.arrayBuffer();
  const inspection = inspectPdfBytes(bytes);
  if (!inspection.isPdf) return NextResponse.json({ error: "The uploaded file does not have a valid PDF signature." }, { status: 415 });
  if (inspection.suspiciousFeatures.length > 0) {
    return NextResponse.json({
      error: "The document contains active or embedded content and was rejected for safe processing.",
      features: inspection.suspiciousFeatures,
    }, { status: 422 });
  }

  const id = crypto.randomUUID();
  const storageKey = `documents/${user.userId}/${id}.pdf`;
  const document = {
    id,
    ownerId: user.userId,
    projectId: null,
    storageKey,
    originalName: safeFilename(file.name),
    contentType: "application/pdf",
    byteSize: file.size,
    processingStatus: "uploaded",
    extractionError: null,
    pageCount: null,
    extractedAt: null,
    createdAt: new Date(),
  };

  try {
    await ensureDbInitialized();
    await getDocumentBucket().put(storageKey, bytes, { httpMetadata: { contentType: "application/pdf" } });
    await getDb().insert(uploadedDocuments).values(document);
    try { await writeAuditEvent(user.userId, "uploaded", "document", document.id); } catch { /* preserve successful upload */ }
    return NextResponse.json({ document: documentResponse(document) }, { status: 201 });
  } catch {
    try { await getDocumentBucket().delete(storageKey); } catch { /* best-effort cleanup */ }
    return NextResponse.json({ error: "Document storage is unavailable. The upload was not saved." }, { status: 503 });
  }
}
