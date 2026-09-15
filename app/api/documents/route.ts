import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb, getDocumentBucket } from "../../../db";
import { uploadedDocuments } from "../../../db/schema";
import { desc, eq } from "drizzle-orm";

const MAX_PDF_BYTES = 25 * 1024 * 1024;
function safeFilename(name: string): string { return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180) || "document.pdf"; }

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to view documents." }, { status: 401 });
  try {
    const documents = await getDb().select({
      id: uploadedDocuments.id, originalName: uploadedDocuments.originalName,
      byteSize: uploadedDocuments.byteSize, processingStatus: uploadedDocuments.processingStatus,
      createdAt: uploadedDocuments.createdAt,
    }).from(uploadedDocuments).where(eq(uploadedDocuments.ownerId, user.userId))
      .orderBy(desc(uploadedDocuments.createdAt)).limit(50);
    return NextResponse.json({ documents });
  } catch {
    return NextResponse.json({ error: "Document storage is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload a document." }, { status: 401 });
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF file to upload." }, { status: 400 });
  if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "Only PDF documents are accepted." }, { status: 415 });
  if (file.size === 0 || file.size > MAX_PDF_BYTES) return NextResponse.json({ error: "PDF files must be between 1 byte and 25 MB." }, { status: 413 });
  const id = crypto.randomUUID();
  const storageKey = "documents/" + user.userId + "/" + id + ".pdf";
  const document = { id, ownerId: user.userId, projectId: null, storageKey, originalName: safeFilename(file.name), contentType: "application/pdf", byteSize: file.size, processingStatus: "queued", createdAt: new Date() };
  try {
    await getDocumentBucket().put(storageKey, await file.arrayBuffer(), { httpMetadata: { contentType: "application/pdf" } });
    await getDb().insert(uploadedDocuments).values(document);
    return NextResponse.json({ document: { id: document.id, originalName: document.originalName, byteSize: document.byteSize, status: document.processingStatus } }, { status: 201 });
  } catch {
    try { await getDocumentBucket().delete(storageKey); } catch { /* best-effort cleanup */ }
    return NextResponse.json({ error: "Document storage is unavailable. The upload was not saved." }, { status: 503 });
  }
}
