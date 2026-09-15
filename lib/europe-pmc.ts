const EUROPE_PMC_SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";
export type LiteratureRecord = { id: string; title: string; authors: string | null; journal: string | null; year: string | null; doi: string | null; pmid: string | null; url: string; publicationType: string | null; };
type EuropePmcResult = { id?: string; source?: string; title?: string; authorString?: string; journalTitle?: string; pubYear?: string; doi?: string; pmid?: string; pubType?: string; };
/** Retrieves bibliographic records only; it never infers findings or certainty from metadata. */
export async function searchLiterature(query: string): Promise<LiteratureRecord[]> {
  const url = new URL(EUROPE_PMC_SEARCH); url.searchParams.set("query", query); url.searchParams.set("format", "json"); url.searchParams.set("pageSize", "5"); url.searchParams.set("resultType", "core");
  const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Europe PMC returned ${response.status}`);
  const data = await response.json() as { resultList?: { result?: EuropePmcResult[] } };
  return (data.resultList?.result ?? []).filter((record) => record.id && record.title).map((record) => ({ id: `${record.source ?? "MED"}:${record.id}`, title: record.title!.replace(/\s+/g, " ").trim(), authors: record.authorString?.trim() ?? null, journal: record.journalTitle?.trim() ?? null, year: record.pubYear ?? null, doi: record.doi ?? null, pmid: record.pmid ?? null, url: record.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${record.pmid}/` : `https://europepmc.org/article/${record.source ?? "MED"}/${record.id}`, publicationType: record.pubType ?? null }));
}
