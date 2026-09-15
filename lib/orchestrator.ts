import type { ResearchMode } from "./research-provider";

export type Workflow = "research" | "appraisal" | "protocol" | "statistics";
export type RoutingDecision = {
  workflow: Workflow;
  agent: string;
  requiresCurrentEvidence: boolean;
  rationale: string;
};

const currentEvidencePattern = /\b(latest|current|newest|recent|this month|updated|guideline|new trial)\b/i;

export function routeResearchRequest(
  selectedMode: "Evidence synthesis" | ResearchMode,
  question: string,
): RoutingDecision {
  const asksForCurrentEvidence = currentEvidencePattern.test(question);
  if (selectedMode === "Paper analysis") return { workflow: "appraisal", agent: "Critical Appraisal Agent", requiresCurrentEvidence: false, rationale: "The request is routed for study design and risk-of-bias assessment." };
  if (selectedMode === "Protocol builder") return { workflow: "protocol", agent: "Protocol Agent", requiresCurrentEvidence: asksForCurrentEvidence, rationale: "The request is routed for structured protocol development." };
  if (selectedMode === "Statistical planning") return { workflow: "statistics", agent: "Statistics Agent", requiresCurrentEvidence: false, rationale: "The request is routed for an assumptions-first analysis plan." };
  return { workflow: "research", agent: "Research Agent", requiresCurrentEvidence: true, rationale: asksForCurrentEvidence ? "The request explicitly needs current evidence." : "Evidence synthesis requires source retrieval before conclusions." };
}
