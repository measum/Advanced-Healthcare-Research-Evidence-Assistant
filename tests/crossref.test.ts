import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyDoi } from "../lib/crossref";

afterEach(() => vi.unstubAllGlobals());

const record = {
  id: "MED:1",
  title: "Clinical outcomes in heart failure treatment",
  authors: null,
  journal: "Test Journal",
  year: "2026",
  doi: "10.1234/example.1",
  pmid: null,
  pmcid: null,
  url: "https://example.test/1",
  fullTextUrl: null,
  fullTextAvailable: false,
  publicationType: null,
  abstract: null,
  retrievedAt: "2026-09-16T00:00:00.000Z",
};

describe("DOI verification", () => {
  it("marks a matching Crossref DOI and title as verified", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: { DOI: "10.1234/example.1", title: ["Clinical outcomes in heart failure treatment"] },
    }), { status: 200 })));
    await expect(verifyDoi(record)).resolves.toMatchObject({ verificationStatus: "verified" });
  });

  it("does not verify a record when Crossref returns a different DOI", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: { DOI: "10.1234/other", title: ["Clinical outcomes in heart failure treatment"] },
    }), { status: 200 })));
    await expect(verifyDoi(record)).resolves.toMatchObject({ verificationStatus: "unverified" });
  });

  it("does not treat a Crossref outage as verification", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(verifyDoi(record)).resolves.toMatchObject({
      verificationStatus: "unverified",
      verificationReason: "Crossref could not be reached; DOI was not verified.",
    });
  });
});
