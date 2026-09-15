import { NextResponse } from "next/server";
import { z } from "zod";

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

  return NextResponse.json({
    status: "provider_not_configured",
    message:
      "Your request was accepted, but the evidence service is not configured. No research claims or citations were generated.",
    safety: {
      requiresVerifiedSources: true,
      individualPatientAdvice: false,
      mode: payload.data.mode,
    },
  });
}
