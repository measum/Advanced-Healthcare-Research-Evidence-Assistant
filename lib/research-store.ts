import { getDb } from "../db";
import { retrievedSources, searchRuns } from "../db/schema";
import type { VerifiedLiteratureRecord } from "./crossref";

export async function recordSearch(
  ownerId: string,
  query: string,
  sources: VerifiedLiteratureRecord[],
): Promise<void> {
  const db = getDb();
  const searchRunId = crypto.randomUUID();
  const now = new Date();
  await db.batch([
    db.insert(searchRuns).values({
      id: searchRunId, ownerId, query, provider: "Europe PMC", createdAt: now,
    }),
    ...sources.map((source) => db.insert(retrievedSources).values({
      id: crypto.randomUUID(), searchRunId, externalId: source.id, title: source.title,
      journal: source.journal, publicationYear: source.year, doi: source.doi,
      pmid: source.pmid, canonicalUrl: source.url,
      verificationStatus: source.verificationStatus,
    })),
  ]);
}
