import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb, ensureDbInitialized } from "../../../db";
import { researchProjects } from "../../../db/schema";
import { writeAuditEvent } from "../../../lib/audit";

const createProjectSchema = z.object({
  name: z.string().trim().min(3).max(120),
  question: z.string().trim().max(8_000).optional(),
});

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to view projects." }, { status: 401 });
  try {
    await ensureDbInitialized();
    const projects = await getDb().select().from(researchProjects)
      .where(eq(researchProjects.ownerId, user.userId))
      .orderBy(desc(researchProjects.updatedAt)).limit(50);
    return NextResponse.json({ projects });
  } catch (err: unknown) {
    console.error("GET /api/projects error:", err);
    return NextResponse.json({ error: "Project storage is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to create a project." }, { status: 401 });
  const payload = createProjectSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Provide a project name between 3 and 120 characters." }, { status: 400 });
  const now = new Date();
  const project = { id: crypto.randomUUID(), ownerId: user.userId, name: payload.data.name, question: payload.data.question || null, createdAt: now, updatedAt: now };
  try {
    await ensureDbInitialized();
    await getDb().insert(researchProjects).values(project);
    try { await writeAuditEvent(user.userId, "created", "research_project", project.id); } catch { /* preserve successful project creation */ }
    return NextResponse.json({ project }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Project storage is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to update a project." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string; name?: string; question?: string } | null;
  if (!body?.id || typeof body.name !== "string" || body.name.trim().length < 3) {
    return NextResponse.json({ error: "Provide a valid project id and a name with at least 3 characters." }, { status: 400 });
  }
  try {
    await ensureDbInitialized();
    const now = new Date();
    await getDb().update(researchProjects)
      .set({ name: body.name.trim(), question: body.question?.trim() || null, updatedAt: now })
      .where(and(eq(researchProjects.id, body.id), eq(researchProjects.ownerId, user.userId)));
    try { await writeAuditEvent(user.userId, "updated", "research_project", body.id); } catch { /* preserve update */ }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to update project." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to delete a project." }, { status: 401 });
  const url = new URL(request.url);
  const idFromQuery = url.searchParams.get("id");
  const body = request.method === "DELETE" && !idFromQuery ? (await request.json().catch(() => null) as { id?: string } | null) : null;
  const id = idFromQuery || body?.id;
  if (!id) return NextResponse.json({ error: "Provide project id to delete." }, { status: 400 });

  try {
    await ensureDbInitialized();
    await getDb().delete(researchProjects)
      .where(and(eq(researchProjects.id, id), eq(researchProjects.ownerId, user.userId)));
    try { await writeAuditEvent(user.userId, "deleted", "research_project", id); } catch { /* preserve delete */ }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete project." }, { status: 503 });
  }
}
