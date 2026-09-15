import { NextResponse } from "next/server";
import { z } from "zod";
import { searchLiterature } from "../../../lib/europe-pmc";
import { getChatGPTUser } from "../../chatgpt-auth";
import { recordSearch } from "../../../lib/research-store";
import { generateResearchDraft } from "../../../lib/research-provider";
import { verifyDoi } from "../../../lib/crossref";
import { routeResearchRequest } from "../../../lib/orchestrator";

const requestSchema = z.object({
  mode: z.enum([
    "Evidence synthesis",
    "Paper analysis",
    "Protocol builder",
    "Statistical planning",
  ]),
  question: z.string().trim().min(3).max(8_000),
});

/**
 * The production orchestrator is intentionally server-side. This endpoint
 * validates untrusted input before any future provider or retrieval call.
 * It must never return an invented citation or clinical recommendation.
 */
export async function POST(request: Request) {
  const payload = requestSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json(
      { error: "Provide a research request between 3 and 8,000 characters." },
      { status: 400 },
    );
  }

  const routing = routeResearchRequest(payload.data.mode, payload.data.question);
  if (payload.data.mode !== "Evidence synthesis") {
    try {
      const draft = await generateResearchDraft(payload.data.mode, payload.data.question);
      if (draft) return NextResponse.json({ status: "draft_generated", message: draft, sources: [], routing, safety: { requiresVerifiedSources: true, individualPatientAdvice: false, mode: payload.data.mode } });
    } catch {
      return NextResponse.json({ status: "provider_unavailable", message: "The model provider is unavailable. No research content, claims, or citations were generated.", sources: [], routing, safety: { requiresVerifiedSources: true, individualPatientAdvice: false, mode: payload.data.mode } }, { status: 503 });
    }
    return NextResponse.json({ status: "provider_not_configured", message: "This workflow needs a configured model provider before it can create research content; no claims or citations were generated.", sources: [], routing, safety: { requiresVerifiedSources: true, individualPatientAdvice: false, mode: payload.data.mode } });
  }
  try {
    const sources = await Promise.all((await searchLiterature(payload.data.question)).map(verifyDoi));
    const user = await getChatGPTUser();
    if (user) {
      try {
        await recordSearch(user.userId, payload.data.question, sources);
      } catch {
        // Retrieval remains useful when a transient database failure occurs.
      }
    }
    return NextResponse.json({ status: "bibliographic_search_complete", message: sources.length ? "I found live bibliographic records. Review full papers before drawing conclusions; metadata alone does not establish evidence certainty." : "No matching bibliographic records were returned. I generated no claims or citations.", sources, routing, safety: { requiresVerifiedSources: true, individualPatientAdvice: false, mode: payload.data.mode } });
  } catch {
    return NextResponse.json({ status: "retrieval_unavailable", message: "The literature service is unavailable. No claims or citations were generated.", sources: [], routing, safety: { requiresVerifiedSources: true, individualPatientAdvice: false, mode: payload.data.mode } }, { status: 503 });
  }
}
