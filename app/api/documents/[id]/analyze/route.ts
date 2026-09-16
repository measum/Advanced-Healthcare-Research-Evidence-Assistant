import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDb, getDocumentBucket } from "../../../../../db";
import { paperAnalyses, uploadedDocuments } from "../../../../../db/schema";
import { analyzePdfDocument } from "../../../../../lib/research-provider";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to analyze a document." }, { status: 401 });
  const { id } = await context.params;
  try {
    const [document] = await getDb().select().from(uploadedDocuments)
      .where(and(eq(uploadedDocuments.id, id), eq(uploadedDocuments.ownerId, user.userId))).limit(1);
    if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    const object = await getDocumentBucket().get(document.storageKey);
    if (!object) return NextResponse.json({ error: "Document object is unavailable." }, { status: 404 });
    const analysis = await analyzePdfDocument(document.originalName, await object.arrayBuffer());
    if (!analysis) return NextResponse.json({ error: "Configure a model provider before document analysis." }, { status: 503 });
    const now = new Date();
    await getDb().batch([
      getDb().insert(paperAnalyses).values({ id: crypto.randomUUID(), documentId: id, ownerId: user.userId, content: analysis, model: "configured-provider", createdAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: paperAnalyses.documentId, set: { content: analysis, model: "configured-provider", updatedAt: now } }),
      getDb().update(uploadedDocuments).set({ processingStatus: "analyzed" }).where(eq(uploadedDocuments.id, id)),
    ]);
    return NextResponse.json({ documentId: id, analysis, sourceWarning: "This analysis is derived from the uploaded document. Verify all claims against the original paper." });
  } catch {
    return NextResponse.json({ error: "Document analysis is unavailable. No analysis was saved." }, { status: 503 });
  }
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to view an analysis." }, { status: 401 });
  const { id } = await context.params;
  try {
    const [analysis] = await getDb().select({ content: paperAnalyses.content, model: paperAnalyses.model, updatedAt: paperAnalyses.updatedAt })
      .from(paperAnalyses).where(and(eq(paperAnalyses.documentId, id), eq(paperAnalyses.ownerId, user.userId))).limit(1);
    if (!analysis) return NextResponse.json({ error: "No saved analysis exists for this document." }, { status: 404 });
    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json({ error: "Analysis storage is unavailable." }, { status: 503 });
  }
}
