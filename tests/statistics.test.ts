import { describe, expect, it } from "vitest";
import { inspectDataset, summarizeDataset, summarizeNumericColumn } from "../lib/statistics";

describe("descriptive statistics", () => {
  const rows = [
    { age: 20, group: "A" },
    { age: 30, group: "A" },
    { age: 40, group: "B" },
    { age: null, group: "B" },
  ];

  it("inspects variable types and missingness without coercion", () => {
    expect(inspectDataset(rows)).toEqual([
      { name: "age", type: "numeric", observed: 3, missing: 1, uniqueValues: 3 },
      { name: "group", type: "categorical", observed: 4, missing: 0, uniqueValues: 2 },
    ]);
  });

  it("calculates transparent numeric summaries", () => {
    expect(summarizeNumericColumn(rows, "age")).toMatchObject({
      column: "age",
      n: 3,
      missing: 1,
      mean: 30,
      median: 30,
      minimum: 20,
      maximum: 40,
    });
  });

  it("returns dataset limitations with the result", () => {
    const summary = summarizeDataset(rows);
    expect(summary.rowCount).toBe(4);
    expect(summary.numeric[0].standardDeviation).toBe(10);
    expect(summary.limitations.length).toBeGreaterThan(0);
  });
});
