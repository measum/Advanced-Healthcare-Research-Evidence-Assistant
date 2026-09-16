import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDb, getDocumentBucket } from "../../../../../db";
import { uploadedDocuments } from "../../../../../db/schema";
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
    return NextResponse.json({ documentId: id, analysis, sourceWarning: "This analysis is derived from the uploaded document. Verify all claims against the original paper." });
  } catch {
    return NextResponse.json({ error: "Document analysis is unavailable. No analysis was saved." }, { status: 503 });
  }
}
