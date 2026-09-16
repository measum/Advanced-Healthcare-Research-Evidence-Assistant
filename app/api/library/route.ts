import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb, ensureDbInitialized } from "../../../db";
import { retrievedSources, searchRuns } from "../../../db/schema";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to view saved evidence." }, { status: 401 });
  try {
    await ensureDbInitialized();
    const rows = await getDb().select({
      sourceId: retrievedSources.id,
      title: retrievedSources.title,
      journal: retrievedSources.journal,
      year: retrievedSources.publicationYear,
      doi: retrievedSources.doi,
      pmid: retrievedSources.pmid,
      url: retrievedSources.canonicalUrl,
      verificationStatus: retrievedSources.verificationStatus,
      query: searchRuns.query,
      retrievedAt: searchRuns.createdAt,
    }).from(retrievedSources)
      .innerJoin(searchRuns, eq(retrievedSources.searchRunId, searchRuns.id))
      .where(eq(searchRuns.ownerId, user.userId))
      .orderBy(desc(searchRuns.createdAt)).limit(50);
    return NextResponse.json({ sources: rows });
  } catch {
    return NextResponse.json({ error: "Evidence library is unavailable." }, { status: 503 });
  }
}
