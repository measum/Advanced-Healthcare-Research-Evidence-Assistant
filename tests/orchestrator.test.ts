import { describe, expect, it } from "vitest";
import { routeResearchRequest } from "../lib/orchestrator";

describe("research request routing", () => {
  it("always requires retrieval for evidence synthesis", () => {
    const decision = routeResearchRequest("Evidence synthesis", "What is known about heart failure?");
    expect(decision).toMatchObject({ workflow: "research", agent: "Research Agent", requiresCurrentEvidence: true });
  });

  it("routes paper analysis to critical appraisal", () => {
    const decision = routeResearchRequest("Paper analysis", "Assess this randomized trial.");
    expect(decision).toMatchObject({ workflow: "appraisal", agent: "Critical Appraisal Agent", requiresCurrentEvidence: false });
  });

  it("flags a current-evidence request in protocol mode", () => {
    const decision = routeResearchRequest("Protocol builder", "Use the latest guideline to design this study.");
    expect(decision.requiresCurrentEvidence).toBe(true);
  });
});
