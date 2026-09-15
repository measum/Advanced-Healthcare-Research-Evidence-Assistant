# Aurelia Research architecture

## Product boundary

This is a healthcare research copilot. It supports research, evidence synthesis, writing, and planning; it is not a clinical decision system or substitute for ethics, statistical, or clinical oversight.

## Phase 1 delivered

- A responsive research workspace with four task modes and a research activity/evidence desk.
- Explicit evidence-safety messaging: no unverifiable citation or claim may be presented as fact.
- An interaction-ready client shell; user questions remain in the local UI until a provider is configured.

## Service boundaries

`UI → orchestrator → specialist workflow → retrieval/verification → evidence store → cited answer`

- **UI:** React/Vinext desktop-responsive workspace.
- **Orchestrator:** classifies intent, checks whether current retrieval is required, selects workflows, and applies safety checks.
- **Provider adapter:** a server-only interface for AI providers. It must be configured with an environment secret; no browser key is allowed.
- **Retrieval adapters:** PubMed/Europe PMC/Crossref/DOI and approved web sources. Each result is parsed, deduplicated, and provenance-stamped.
- **Evidence service:** attaches source identifiers, publication type, recency, verification status, and certainty notes to individual claims.
- **Persistence:** D1 tables for projects, conversations, documents, sources, evidence claims, tasks, and audit events. R2 is reserved for uploaded PDFs; extracted text is treated as untrusted.

## Security requirements

- Authenticate before user-owned reads or writes; authorize every project ID server-side.
- Store secrets only as server runtime variables. Encrypt transit via the platform; use least-privilege provider keys.
- Validate file type/size, isolate extraction, strip active content, and defend every document against prompt injection.
- Require confirmation for deletion and external side effects. Append audit events for provider calls and evidence changes.
- Never place protected health information in prompts unless the deployment has an approved data-processing path.

## Delivery phases

1. Current workspace and provider abstraction.
2. Authenticated document/PDF ingestion and isolated extraction.
3. Verified literature retrieval and reproducible search strings.
4. Citation/DOI verification and claim-level provenance.
5. Specialist workflow orchestration and structured appraisal.
6. Dataset inspection and sandboxed statistical workflows.
7. Persistent projects, tasks, timelines, and user-controlled memory.
8. Voice, browser automation, and approved integrations.

## Required external services

An AI model provider and literature metadata/full-text providers are external dependencies. Optional integrations include reference managers, calendar/tasks, and institutional access. The UI and non-sensitive local interaction can run without them; source-grounded answers cannot.
