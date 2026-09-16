import { NextResponse } from "next/server";
import { z } from "zod";
import { summarizeDataset } from "../../../lib/statistics";

const requestSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(10_000),
});

const MAX_REQUEST_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const rawBody = await request.text().catch(() => "");
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Dataset payload exceeds the 5 MB analysis limit." }, { status: 413 });
  }
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody || "null") as unknown;
  } catch {
    return NextResponse.json({ error: "Provide valid JSON dataset rows." }, { status: 400 });
  }
  const payload = requestSchema.safeParse(parsedBody);
  if (!payload.success) {
    return NextResponse.json({ error: "Provide a non-empty JSON array of dataset rows." }, { status: 400 });
  }

  try {
    const summary = summarizeDataset(payload.data.rows);
    return NextResponse.json({ status: "descriptive_analysis_complete", summary });
  } catch {
    return NextResponse.json({ error: "The dataset could not be inspected safely." }, { status: 422 });
  }
}
