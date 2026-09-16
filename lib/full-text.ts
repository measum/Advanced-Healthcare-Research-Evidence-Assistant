const EUROPE_PMC_FULL_TEXT = "https://www.ebi.ac.uk/europepmc/webservices/rest";
const MAX_FULL_TEXT_BYTES = 4 * 1024 * 1024;
const MAX_FULL_TEXT_CHARS = 1_000_000;

export type FullTextResult = {
  pmcid: string;
  sourceUrl: string;
  text: string;
  retrievedAt: string;
};

function decodeXml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function xmlToText(xml: string): string {
  return decodeXml(xml
    .replace(/<\?xml[^>]*>/gi, " ")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()).slice(0, MAX_FULL_TEXT_CHARS);
}

/**
 * Retrieve only Europe PMC Open Access full text. The PMCID is validated and
 * interpolated into a fixed provider URL; callers cannot supply an arbitrary
 * URL, preventing SSRF through this endpoint.
 */
export async function fetchOpenAccessFullText(pmcid: string): Promise<FullTextResult | null> {
  const normalized = pmcid.trim().toUpperCase();
  if (!/^PMC\d+$/.test(normalized)) return null;
  const sourceUrl = `${EUROPE_PMC_FULL_TEXT}/${normalized}/fullTextXML`;

  try {
    const response = await fetch(sourceUrl, {
      headers: { accept: "application/xml, text/xml" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_FULL_TEXT_BYTES) return null;
    const xml = await response.text();
    if (new TextEncoder().encode(xml).byteLength > MAX_FULL_TEXT_BYTES) return null;
    const text = xmlToText(xml);
    if (!text) return null;
    return { pmcid: normalized, sourceUrl, text, retrievedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}
