import { describe, expect, it } from "vitest";
import { searchLiterature } from "../lib/europe-pmc";

describe("searchLiterature", () => {
  it("returns relevant curated peer-reviewed literature records on offline fallback", async () => {
    const results = await searchLiterature("Semaglutide cardiovascular outcomes");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty("title");
    expect(results[0]).toHaveProperty("doi");
    expect(results[0]).toHaveProperty("url");
  });

  it("handles general clinical search queries", async () => {
    const results = await searchLiterature("AI in medical imaging");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.journal?.includes("JAMA") || r.journal?.includes("Nature") || r.journal?.includes("Lancet"))).toBe(true);
  });
});
