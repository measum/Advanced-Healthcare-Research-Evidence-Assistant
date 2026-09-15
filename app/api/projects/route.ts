import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { researchProjects } from "../../../db/schema";

const createProjectSchema = z.object({
  name: z.string().trim().min(3).max(120),
  question: z.string().trim().max(8_000).optional(),
});

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to view projects." }, { status: 401 });
  try {
    const projects = await getDb().select().from(researchProjects)
      .where(eq(researchProjects.ownerId, user.userId))
      .orderBy(desc(researchProjects.updatedAt)).limit(50);
    return NextResponse.json({ projects });
  } catch {
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
    await getDb().insert(researchProjects).values(project);
    return NextResponse.json({ project }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Project storage is unavailable." }, { status: 503 });
  }
}
