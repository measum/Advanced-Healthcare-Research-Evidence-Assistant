export type DatasetRow = Record<string, unknown>;

export type VariableSummary = {
  name: string;
  type: "numeric" | "categorical" | "boolean" | "mixed" | "empty";
  observed: number;
  missing: number;
  uniqueValues: number;
};

export type NumericSummary = {
  column: string;
  n: number;
  missing: number;
  mean: number | null;
  median: number | null;
  standardDeviation: number | null;
  minimum: number | null;
  maximum: number | null;
};

function isMissing(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function finiteNumbers(rows: DatasetRow[], column: string): number[] {
  return rows
    .map((row) => row[column])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function percentile(sorted: number[], probability: number): number {
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function inspectDataset(rows: DatasetRow[]): VariableSummary[] {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
  return columns.map((name) => {
    const values = rows.map((row) => row[name]);
    const observedValues = values.filter((value) => !isMissing(value));
    const types = new Set(observedValues.map((value) => typeof value));
    const type: VariableSummary["type"] = observedValues.length === 0
      ? "empty"
      : types.size > 1
        ? "mixed"
        : types.has("number")
          ? "numeric"
          : types.has("boolean")
            ? "boolean"
            : "categorical";
    return {
      name,
      type,
      observed: observedValues.length,
      missing: values.length - observedValues.length,
      uniqueValues: new Set(observedValues.map((value) => JSON.stringify(value))).size,
    };
  });
}

export function summarizeNumericColumn(rows: DatasetRow[], column: string): NumericSummary {
  const values = finiteNumbers(rows, column).sort((left, right) => left - right);
  const missing = rows.length - values.length;
  if (values.length === 0) {
    return { column, n: 0, missing, mean: null, median: null, standardDeviation: null, minimum: null, maximum: null };
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.length > 1
    ? values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (values.length - 1)
    : 0;
  return {
    column,
    n: values.length,
    missing,
    mean,
    median: percentile(values, 0.5),
    standardDeviation: values.length > 1 ? Math.sqrt(variance) : 0,
    minimum: values[0],
    maximum: values[values.length - 1],
  };
}

export function summarizeDataset(rows: DatasetRow[]) {
  if (rows.length === 0) throw new Error("At least one dataset row is required.");
  const variables = inspectDataset(rows);
  const numeric = variables.filter((variable) => variable.type === "numeric")
    .map((variable) => summarizeNumericColumn(rows, variable.name));
  return {
    rowCount: rows.length,
    variables,
    numeric,
    limitations: [
      "This endpoint performs descriptive inspection only; it does not establish causality or clinical significance.",
      "Non-numeric values in a numeric column are counted as missing and are not silently coerced.",
      "Inferential tests require a prespecified estimand, design, assumptions, and missing-data plan.",
    ],
  };
}
