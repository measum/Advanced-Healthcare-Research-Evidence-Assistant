import { afterEach, describe, expect, it, vi } from "vitest";
import { searchLiterature } from "../lib/europe-pmc";

describe("searchLiterature", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns relevant curated peer-reviewed literature records on offline fallback", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network unavailable"));

    const results = await searchLiterature("Semaglutide cardiovascular outcomes");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty("title");
    expect(results[0]).toHaveProperty("doi");
    expect(results[0]).toHaveProperty("url");
  });

  it("returns valid literature records for general clinical search queries", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network unavailable"));

    const results = await searchLiterature("AI in medical imaging");

    expect(results.length).toBeGreaterThan(0);

    for (const result of results) {
      expect(result.id).toBeTruthy();
      expect(typeof result.title).toBe("string");
      expect(result.title.length).toBeGreaterThan(5);
      expect(result.url).toMatch(/^https?:\/\//);
    }
  });
});
