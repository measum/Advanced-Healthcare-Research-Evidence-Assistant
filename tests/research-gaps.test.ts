import { describe, expect, it } from "vitest";
import { detectResearchGaps, generateResearchOpportunities } from "../lib/research-gaps";
import type { VerifiedLiteratureRecord } from "../lib/crossref";

const source = (overrides: Partial<VerifiedLiteratureRecord> = {}): VerifiedLiteratureRecord => ({
  id: "MED:1",
  title: "Prospective study of an intervention",
  authors: "Author A",
  journal: "Research Journal",
  year: "2025",
  doi: "10.1000/example",
  pmid: "1",
  pmcid: null,
  url: "https://pubmed.ncbi.nlm.nih.gov/1/",
  fullTextUrl: null,
  fullTextAvailable: false,
  publicationType: "Prospective Cohort Study",
  abstract: "The study reports uncertain and heterogeneous findings.",
  retrievedAt: "2026-09-16T00:00:00.000Z",
  verificationStatus: "verified",
  verificationReason: "Matched in test",
  verifiedAt: "2026-09-16T00:00:00.000Z",
  ...overrides,
});

describe("research gap detection", () => {
  it("returns no gaps without source evidence", () => {
    expect(detectResearchGaps("AI in radiology", [])).toEqual([]);
  });

  it("attaches observed gaps to supporting source records", () => {
    const gaps = detectResearchGaps("AI in radiology", [source()]);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0].supportingSources[0]).toMatchObject({ id: "MED:1", verificationStatus: "verified" });
    expect(gaps.some((gap) => gap.id === "reported-uncertainty")).toBe(true);
  });

  it("generates opportunities without inventing study results", () => {
    const [opportunity] = generateResearchOpportunities(detectResearchGaps("AI in radiology", [source()]));
    expect(opportunity.researchGap).toContain("retrieved");
    expect(opportunity.primaryOutcome).toContain("Not specified");
    expect(opportunity.uncertainty).toContain("not an established research priority");
  });
});
