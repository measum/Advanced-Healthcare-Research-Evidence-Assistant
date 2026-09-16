import { NextResponse } from "next/server";
import { z } from "zod";
import { searchLiterature } from "../../../../lib/europe-pmc";
import { verifyDoi } from "../../../../lib/crossref";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { recordSearch } from "../../../../lib/research-store";
import { detectResearchGaps, generateResearchOpportunities } from "../../../../lib/research-gaps";

const requestSchema = z.object({
  question: z.string().trim().min(3).max(8_000),
});

export async function POST(request: Request) {
  const payload = requestSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "Provide a research question between 3 and 8,000 characters." }, { status: 400 });
  }

  const rawSources = await searchLiterature(payload.data.question);
  const sources = await Promise.all(rawSources.map(verifyDoi));
  const user = await getChatGPTUser();
  if (user && sources.length > 0) {
    try {
      await recordSearch(user.userId, payload.data.question, sources);
    } catch {
      // Gap detection remains useful if persistence is temporarily unavailable.
    }
  }

  const gaps = detectResearchGaps(payload.data.question, sources);
  return NextResponse.json({
    status: sources.length > 0 ? "gap_analysis_complete" : "no_verified_evidence",
    question: payload.data.question,
    sourceCount: sources.length,
    sources,
    gaps,
    opportunities: generateResearchOpportunities(gaps),
    safety: {
      sourceGrounded: true,
      completeSystematicReview: false,
      message: sources.length > 0
        ? "Gaps are limited to signals observable in this retrieval set; this is not a complete systematic review."
        : "No source-supported gap was generated because no literature records were retrieved.",
    },
  });
}
