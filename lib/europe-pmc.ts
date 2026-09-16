const EUROPE_PMC_SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

export type LiteratureRecord = {
  id: string;
  title: string;
  authors: string | null;
  journal: string | null;
  year: string | null;
  doi: string | null;
  pmid: string | null;
  pmcid: string | null;
  url: string;
  fullTextUrl: string | null;
  fullTextAvailable: boolean;
  publicationType: string | null;
  abstract: string | null;
  fullText?: string | null;
  fullTextRetrievedAt?: string;
  retrievedAt: string;
};

type EuropePmcFullTextUrl = {
  url?: string;
  site?: string;
  availability?: string;
};

type EuropePmcResult = {
  id?: string;
  source?: string;
  title?: string;
  authorString?: string;
  journalTitle?: string;
  pubYear?: string;
  doi?: string;
  pmid?: string;
  pmcid?: string;
  pubType?: string;
  pubTypeList?: { pubType?: string[] };
  abstractText?: string;
  isOpenAccess?: boolean | string;
  fullTextUrlList?: { fullTextUrl?: EuropePmcFullTextUrl[] };
};

const SEARCH_STOP_WORDS = new Set([
  "about", "after", "against", "among", "and", "are", "clinical", "for", "from", "how", "into",
  "latest", "new", "of", "on", "the", "this", "what", "with", "without",
]);

function cleanText(value: string | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

function normalizedKey(record: LiteratureRecord): string {
  if (record.pmid) return `pmid:${record.pmid}`;
  if (record.doi) return `doi:${record.doi.toLowerCase()}`;
  return `title:${record.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`;
}

function queryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2 && !SEARCH_STOP_WORDS.has(term));
}

function rankRecord(record: LiteratureRecord, terms: string[]): number {
  const content = `${record.title} ${record.abstract ?? ""} ${record.journal ?? ""} ${record.publicationType ?? ""}`.toLowerCase();
  return terms.reduce((score, term) => score + (content.includes(term) ? (record.title.toLowerCase().includes(term) ? 4 : 1) : 0), 0);
}

function toRecord(result: EuropePmcResult, retrievedAt: string): LiteratureRecord | null {
  if (!result.id || !result.title) return null;
  const source = result.source ?? "MED";
  const pmid = result.pmid ?? (source === "MED" ? result.id : null) ?? null;
  const pmcid = result.pmcid ?? null;
  const fullTextUrl = result.fullTextUrlList?.fullTextUrl?.find((item) => item.url)?.url
    ?? (pmcid ? `https://europepmc.org/articles/${pmcid}` : null);
  const openAccess = result.isOpenAccess === true || result.isOpenAccess === "Y" || result.isOpenAccess === "true";
  const publicationType = result.pubType?.trim()
    || result.pubTypeList?.pubType?.filter(Boolean).join(", ")
    || null;

  return {
    id: `${source}:${result.id}`,
    title: result.title.replace(/\s+/g, " ").trim(),
    authors: result.authorString?.trim() || null,
    journal: result.journalTitle?.trim() || null,
    year: result.pubYear ?? null,
    doi: result.doi?.trim() || null,
    pmid,
    pmcid,
    url: pmid
      ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
      : `https://europepmc.org/article/${source}/${result.id}`,
    fullTextUrl,
    fullTextAvailable: Boolean(fullTextUrl || pmcid || openAccess),
    publicationType,
    abstract: cleanText(result.abstractText),
    retrievedAt,
  };
}

/**
 * Retrieve bibliographic records from Europe PMC only.
 *
 * There is deliberately no fabricated/offline citation fallback. If the
 * external index is unavailable, callers receive an empty result and must
 * communicate that evidence could not be verified.
 */
export async function searchLiterature(query: string): Promise<LiteratureRecord[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  try {
    const url = new URL(EUROPE_PMC_SEARCH);
    url.searchParams.set("query", trimmedQuery);
    url.searchParams.set("format", "json");
    url.searchParams.set("pageSize", "20");
    url.searchParams.set("resultType", "core");

    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return [];

    const data = await response.json() as { resultList?: { result?: EuropePmcResult[] } };
    const retrievedAt = new Date().toISOString();
    const terms = queryTerms(trimmedQuery);
    const unique = new Map<string, LiteratureRecord>();

    for (const result of data.resultList?.result ?? []) {
      const record = toRecord(result, retrievedAt);
      if (!record) continue;
      const key = normalizedKey(record);
      const existing = unique.get(key);
      if (!existing) {
        unique.set(key, record);
      } else {
        unique.set(key, {
          ...existing,
          authors: existing.authors ?? record.authors,
          journal: existing.journal ?? record.journal,
          year: existing.year ?? record.year,
          doi: existing.doi ?? record.doi,
          pmid: existing.pmid ?? record.pmid,
          pmcid: existing.pmcid ?? record.pmcid,
          fullTextUrl: existing.fullTextUrl ?? record.fullTextUrl,
          fullTextAvailable: existing.fullTextAvailable || record.fullTextAvailable,
          publicationType: existing.publicationType ?? record.publicationType,
          abstract: existing.abstract ?? record.abstract,
        });
      }
    }

    return [...unique.values()]
      .sort((left, right) => rankRecord(right, terms) - rankRecord(left, terms))
      .slice(0, 20);
  } catch {
    return [];
  }
}
