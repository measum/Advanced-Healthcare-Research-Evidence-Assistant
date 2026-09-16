import type { VerifiedLiteratureRecord } from "./crossref";

export type GapSource = {
  id: string;
  title: string;
  url: string;
  verificationStatus: VerifiedLiteratureRecord["verificationStatus"];
  excerpt: string | null;
};

export type ResearchGap = {
  id: string;
  topic: string;
  evidenceCount: number;
  observedGap: string;
  potentialQuestion: string;
  rationale: string;
  evidenceConfidence: "Limited — metadata/abstract-level" | "Moderate — multiple source signals";
  supportingSources: GapSource[];
};

export type ResearchOpportunity = {
  id: string;
  title: string;
  researchQuestion: string;
  whyThisQuestionExists: string;
  researchGap: string;
  suggestedStudyDesign: string;
  population: string;
  primaryOutcome: string;
  secondaryOutcomes: string;
  possibleStatisticalApproach: string;
  keyRisks: string;
  relevantPapers: GapSource[];
  evidenceConfidence: ResearchGap["evidenceConfidence"];
  uncertainty: string;
};

function excerpt(source: VerifiedLiteratureRecord): string | null {
  const text = source.abstract?.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 360) : null;
}

function sourceList(sources: VerifiedLiteratureRecord[]): GapSource[] {
  return sources.map((source) => ({
    id: source.id,
    title: source.title,
    url: source.url,
    verificationStatus: source.verificationStatus,
    excerpt: excerpt(source),
  }));
}

function topicFromQuestion(question: string): string {
  const trimmed = question.trim().replace(/[?.!]+$/, "");
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
}

function evidenceConfidence(sources: VerifiedLiteratureRecord[]): ResearchGap["evidenceConfidence"] {
  return sources.length > 2 && sources.filter((source) => source.abstract).length > 1
    ? "Moderate — multiple source signals"
    : "Limited — metadata/abstract-level";
}

/**
 * Identify only gaps that can be observed from the returned records. This
 * deliberately avoids pretending that a small search result is a complete
 * map of a field; every gap carries its supporting records and limitations.
 */
export function detectResearchGaps(question: string, sources: VerifiedLiteratureRecord[]): ResearchGap[] {
  if (sources.length === 0) return [];
  const supportingSources = sourceList(sources);
  const confidence = evidenceConfidence(sources);
  const topic = topicFromQuestion(question);
  const gaps: ResearchGap[] = [];
  const abstractsMissing = sources.filter((source) => !source.abstract);
  const fullTextMissing = sources.filter((source) => !source.fullTextAvailable);
  const publicationTypes = new Set(sources.map((source) => source.publicationType).filter(Boolean));
  const abstractText = sources.map((source) => source.abstract ?? "").join(" ").toLowerCase();

  if (abstractsMissing.length > 0) {
    gaps.push({
      id: "abstract-reporting",
      topic,
      evidenceCount: sources.length,
      observedGap: `${abstractsMissing.length} of ${sources.length} retrieved record(s) did not include an abstract in the Europe PMC response.`,
      potentialQuestion: `What do the full texts of the retrieved studies report about ${topic}?`,
      rationale: "Study-level methods and outcomes cannot be assessed reliably from records without an abstract.",
      evidenceConfidence: confidence,
      supportingSources,
    });
  }

  if (fullTextMissing.length > 0) {
    gaps.push({
      id: "full-text-access",
      topic,
      evidenceCount: sources.length,
      observedGap: `${fullTextMissing.length} retrieved record(s) do not expose a full-text link in the current response.`,
      potentialQuestion: `Can the evidence for ${topic} be confirmed after obtaining the original full texts?`,
      rationale: "Risk of bias, denominators, detailed outcomes, and reproducibility cannot be confirmed from bibliographic metadata alone.",
      evidenceConfidence: "Limited — metadata/abstract-level",
      supportingSources,
    });
  }

  if (publicationTypes.size <= 1) {
    const onlyType = [...publicationTypes][0] ?? "not reported";
    gaps.push({
      id: "design-diversity",
      topic,
      evidenceCount: sources.length,
      observedGap: `The retrieved set represents only one reported publication type (${onlyType}).`,
      potentialQuestion: `How consistent is the evidence for ${topic} across complementary study designs?`,
      rationale: "A single returned design type limits assessment of external validity, implementation, and possible confounding.",
      evidenceConfidence: confidence,
      supportingSources,
    });
  }

  if (/conflict|inconsistent|mixed result|heterogen|uncertain|contradict/.test(abstractText)) {
    gaps.push({
      id: "reported-uncertainty",
      topic,
      evidenceCount: sources.length,
      observedGap: "At least one retrieved abstract uses language indicating uncertainty, heterogeneity, or conflicting findings.",
      potentialQuestion: `Which population, intervention, outcome, or methodological differences explain the reported uncertainty for ${topic}?`,
      rationale: "The signal is abstract-level and requires full-text comparison before treating the findings as a true contradiction.",
      evidenceConfidence: confidence,
      supportingSources,
    });
  }

  if (gaps.length === 0) {
    gaps.push({
      id: "full-text-appraisal-needed",
      topic,
      evidenceCount: sources.length,
      observedGap: "The returned records do not provide enough structured information to establish a defensible research gap.",
      potentialQuestion: `What unanswered question remains after full-text appraisal of ${topic}?`,
      rationale: "A defensible gap requires study-level populations, methods, outcomes, limitations, and comparison of the original papers.",
      evidenceConfidence: "Limited — metadata/abstract-level",
      supportingSources,
    });
  }

  return gaps;
}

export function generateResearchOpportunities(gaps: ResearchGap[]): ResearchOpportunity[] {
  return gaps.map((gap) => ({
    id: `opportunity-${gap.id}`,
    title: `Investigate the evidence gap: ${gap.topic}`,
    researchQuestion: gap.potentialQuestion,
    whyThisQuestionExists: gap.rationale,
    researchGap: gap.observedGap,
    suggestedStudyDesign: "To be selected after full-text appraisal and feasibility review.",
    population: "Not specified; define from the verified gap and target setting.",
    primaryOutcome: "Not specified; prespecify one measurable outcome before protocol drafting.",
    secondaryOutcomes: "Not specified.",
    possibleStatisticalApproach: "To be selected after the estimand, outcome type, clustering, and missing-data assumptions are defined.",
    keyRisks: "Selection bias, incomplete source access, outcome heterogeneity, and overgeneralization from a limited retrieval set.",
    relevantPapers: gap.supportingSources,
    evidenceConfidence: gap.evidenceConfidence,
    uncertainty: "This is an evidence-supported opportunity, not an established research priority. The returned records are not a complete systematic review.",
  }));
}
