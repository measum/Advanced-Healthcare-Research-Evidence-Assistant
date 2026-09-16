import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOpenAccessFullText } from "../lib/full-text";

afterEach(() => vi.unstubAllGlobals());

describe("open-access full text retrieval", () => {
  it("retrieves and strips Europe PMC XML for a validated PMCID", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      "<?xml version=\"1.0\"?><article><title>Study &amp; Methods</title><body>Results are reported.</body></article>",
      { status: 200, headers: { "content-type": "application/xml" } },
    )));
    const result = await fetchOpenAccessFullText("pmc123");
    expect(result).toMatchObject({ pmcid: "PMC123", text: "Study & Methods Results are reported." });
  });

  it("rejects arbitrary identifiers instead of making arbitrary URL requests", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchOpenAccessFullText("https://evil.example")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
