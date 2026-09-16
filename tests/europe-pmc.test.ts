import { afterEach, describe, expect, it, vi } from "vitest";
import { searchLiterature } from "../lib/europe-pmc";

afterEach(() => vi.unstubAllGlobals());

describe("searchLiterature", () => {
  it("maps, ranks, and deduplicates Europe PMC records", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      resultList: {
        result: [
          {
            id: "2",
            source: "MED",
            title: "A study of cardiovascular outcomes",
            authorString: "Researcher A",
            journalTitle: "Test Journal",
            pubYear: "2025",
            doi: "10.1000/example-2",
            pmid: "2",
            pmcid: "PMC2",
            pubType: "Clinical Trial",
            abstractText: "Cardiovascular outcomes were evaluated.",
            isOpenAccess: "Y",
          },
          {
            id: "1",
            source: "MED",
            title: "Semaglutide cardiovascular outcomes",
            authorString: "Researcher B",
            journalTitle: "Test Journal",
            pubYear: "2025",
            doi: "10.1000/example-1",
            pmid: "1",
            pubTypeList: { pubType: ["Randomized Controlled Trial"] },
            abstractText: "A randomized study abstract.",
          },
          {
            id: "1",
            source: "MED",
            title: "Semaglutide cardiovascular outcomes",
            pmid: "1",
          },
        ],
      },
    }), { status: 200 })));

    const results = await searchLiterature("Semaglutide cardiovascular outcomes");
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      pmid: "1",
      abstract: "A randomized study abstract.",
      publicationType: "Randomized Controlled Trial",
    });
    expect(results[1]).toMatchObject({ pmcid: "PMC2", fullTextAvailable: true });
  });

  it("returns no records when the literature service is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(searchLiterature("AI in medical imaging")).resolves.toEqual([]);
  });
});
