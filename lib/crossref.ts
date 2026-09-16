import type { LiteratureRecord } from "./europe-pmc";

export type VerifiedLiteratureRecord = LiteratureRecord & {
  verificationStatus: "verified" | "unverified";
  verificationReason: string;
  verifiedAt: string;
};

function normalize(value: string): string[] {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((word) => word.length > 3);
}

function titlesAgree(left: string, right: string): boolean {
  const leftWords = new Set(normalize(left));
  const rightWords = normalize(right);
  return rightWords.length > 0 && rightWords.filter((word) => leftWords.has(word)).length >= Math.min(3, rightWords.length);
}

function result(
  record: LiteratureRecord,
  verificationStatus: "verified" | "unverified",
  verificationReason: string,
): VerifiedLiteratureRecord {
  return {
    ...record,
    verificationStatus,
    verificationReason,
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Verify DOI metadata against Crossref. Network failure is never treated as
 * proof of a valid DOI; those records remain explicitly unverified.
 */
export async function verifyDoi(record: LiteratureRecord): Promise<VerifiedLiteratureRecord> {
  if (!record.doi) return result(record, "unverified", "No DOI was supplied by the literature index.");

  try {
    const response = await fetch("https://api.crossref.org/works/" + encodeURIComponent(record.doi), {
      headers: { accept: "application/json", "user-agent": "AIOTIE-Research/1.0 (mailto:research@aiotie.org)" },
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) return result(record, "unverified", `Crossref returned HTTP ${response.status}.`);

    const data = await response.json() as { message?: { DOI?: string; title?: string[] } };
    const title = data.message?.title?.[0];
    const sameDoi = data.message?.DOI?.toLowerCase() === record.doi.toLowerCase();
    if (sameDoi && !!title && titlesAgree(record.title, title)) {
      return result(record, "verified", "Crossref DOI and title metadata matched.");
    }
    return result(record, "unverified", "Crossref metadata did not match the supplied DOI and title.");
  } catch {
    return result(record, "unverified", "Crossref could not be reached; DOI was not verified.");
  }
}
