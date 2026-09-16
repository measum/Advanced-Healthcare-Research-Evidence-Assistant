import { getDb, ensureDbInitialized } from "../db";
import { auditEvents, retrievedSources, searchRuns } from "../db/schema";
import type { VerifiedLiteratureRecord } from "./crossref";

export async function recordSearch(
  ownerId: string,
  query: string,
  sources: VerifiedLiteratureRecord[],
): Promise<void> {
  await ensureDbInitialized();
  const db = getDb();
  const searchRunId = crypto.randomUUID();
  const now = new Date();
  await db.batch([
    db.insert(searchRuns).values({
      id: searchRunId, ownerId, query, provider: "Europe PMC", createdAt: now,
    }),
    db.insert(auditEvents).values({
      id: crypto.randomUUID(), ownerId, action: "retrieved", entityType: "search_run", entityId: searchRunId, createdAt: now,
    }),
    ...sources.map((source) => db.insert(retrievedSources).values({
      id: crypto.randomUUID(),
      searchRunId,
      externalId: source.id,
      title: source.title,
      authors: source.authors,
      journal: source.journal,
      publicationYear: source.year,
      publicationType: source.publicationType,
      abstract: source.abstract,
      doi: source.doi,
      pmid: source.pmid,
      pmcid: source.pmcid,
      canonicalUrl: source.url,
      fullTextUrl: source.fullTextUrl,
      fullTextAvailable: source.fullTextAvailable,
      verificationStatus: source.verificationStatus,
      verificationReason: source.verificationReason,
      retrievedAt: now,
    })),
  ]);
}
