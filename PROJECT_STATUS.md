# AIOTIE Research Chatbot — Project Status

**Last updated:** 2026-09-16
**Repository snapshot:** `d0f81bd`
**Overall status:** Functional research-workspace prototype. The core chat, literature retrieval, evidence library, project storage, PDF ingestion, and specialist-routing foundations are implemented. Source-grounded workflow depth, safety hardening, and production readiness are still in progress.

## Status at a glance

| Area | Current status |
| --- | --- |
| Research chat workspace | Implemented and interactive |
| Workflow routing | Implemented for Evidence Synthesis, Paper Analysis, Protocol Builder, and Statistical Planning |
| Literature retrieval | Europe PMC retrieval with PubMed/Europe PMC links implemented |
| DOI verification | Crossref verification implemented; records are marked verified or unverified |
| AI provider | Server-side OpenAI Responses API adapter implemented; runtime secret required for model-backed output |
| Local fallback output | Implemented as a prototype scaffold; it must not be treated as verified clinical evidence |
| PDF upload | PDF-only validation, 25 MB limit, private object-storage path, and durable metadata implemented |
| PDF text analysis | Basic extraction and structured appraisal implemented; OCR and hardened isolation are not complete |
| Projects and evidence library | Owner-scoped D1 persistence and library APIs implemented |
| Authentication | ChatGPT/Sites identity adapter implemented; hosted authentication policy still needs configuration |
| Automated validation | 9 tests pass and production build passes; lint currently has 8 errors and 12 warnings |
| Production deployment | Not yet completed |

## Implemented features

### 1. Research chat and workspace

- Responsive AIOTIE Research workspace with a central composer and response/evidence desk.
- Four workflow modes:
  - Evidence synthesis
  - Paper analysis
  - Protocol builder
  - Statistical planning
- Research history displayed in the session memory view.
- Copy response, Markdown report export, and BibTeX evidence-library export.
- Browser voice dictation support with a local fallback when the Web Speech API is unavailable.
- Interactive project selector, notification panel, profile panel, settings panel, and research-partner status panel.

### 2. Research intelligence interface

- Interactive global research map with geographic filters, zoom controls, research hubs, and hub-specific evidence/protocol actions.
- Trends and Ideas views with topic exploration actions.
- Research insights, emerging-topic signals, personalized research interests, and protocol/evidence shortcuts.
- Systematic-review, manuscript, reviewer, memory, and statistics entry points are present in the UI. Their complete domain workflows are not yet implemented end to end.

### 3. Evidence retrieval and verification

- Live bibliographic search through Europe PMC.
- Canonical PubMed and Europe PMC links.
- Crossref DOI lookup for DOI-bearing records.
- Explicit `verified` or `unverified` source status.
- Persistent search runs and retrieved source records for signed-in users.
- Evidence-safety responses state that metadata is not, by itself, a clinical conclusion.

### 4. Model and orchestration layer

- Server-side OpenAI Responses API integration.
- Runtime-secret-only model configuration; browser code does not receive the provider key.
- Requests use `store: false`.
- Provider instructions prohibit invented citations, studies, numerical results, guidelines, and individual patient advice.
- Intent routing selects Research, Critical Appraisal, Protocol, or Statistics agents and records the routing rationale.
- If the provider is unavailable or not configured, the application returns a clear status or uses the current local prototype generator, depending on the workflow.

### 5. PDF ingestion and paper appraisal

- Authenticated PDF upload route with:
  - PDF MIME-type and filename validation
  - `%PDF-` signature validation
  - 25 MB maximum file size
  - Safe filename normalization
  - Private R2/object-storage key layout
- Uploaded document metadata and processing status are persisted in D1.
- Basic text and metadata extraction supports direct and Flate-compressed PDF streams.
- Optional model-backed appraisal uploads the PDF to the configured provider, treats the document as untrusted content, and removes the temporary provider file afterward.
- Structured local appraisal fallback includes design, PICO, endpoints, risk of bias, limitations, generalizability, and what the study does not prove.
- Saved paper analyses can be retrieved and replaced; document analysis events are audit-recorded.

### 6. Persistence, authorization, and audit records

- D1/Drizzle schema includes:
  - Research projects
  - Search runs
  - Retrieved sources
  - Uploaded documents
  - Paper analyses
  - Audit events
- User-owned queries are filtered by the resolved user ID.
- Project and document create, update/delete, and list operations are available at the API layer.
- Storage failures are handled without claiming that an unsuccessful upload or analysis was saved.
- Audit events are written for project and document mutations and document analysis.
- In local development without injected platform identity headers, the existing adapter uses the configured development researcher identity; production access policy still needs to be configured and verified.

## Current API surface

| Route | Purpose |
| --- | --- |
| `POST /api/research` | Routes the request, retrieves current literature for Evidence Synthesis, verifies DOI metadata, and optionally saves search history. Other modes use the configured provider or prototype fallback. |
| `GET, POST, PATCH, DELETE /api/projects` | Lists, creates, updates, and deletes owner-scoped research projects. |
| `GET, POST, DELETE /api/documents` | Lists, validates/uploads, and deletes owner-scoped PDF documents. |
| `GET, POST /api/documents/:id/analyze` | Reads a saved analysis or analyzes an uploaded PDF and persists the result. |
| `GET /api/library` | Lists the signed-in researcher's saved source history. |

## Known limitations and risks

### Evidence-grounding priority

The current local evidence-synthesis fallback is a demonstration scaffold. It includes generic example effect sizes and conclusions rather than deriving every claim from retrieved study-level data. It must be replaced with a source-grounded synthesis pipeline before the chatbot is used for clinical, policy, protocol, or publication decisions. All fallback outputs should be treated as drafts only.

### Document processing

- PDF extraction is a basic parser and does not yet provide OCR for scanned documents.
- Extraction is not yet isolated in a dedicated worker or sandbox.
- Malicious-document screening, active-content handling, extraction quotas, and comprehensive prompt-injection defenses remain to be completed.
- Full-text evidence extraction with claim-level provenance is not implemented.

### Workflow depth

- Systematic review screening, deduplication, extraction, risk-of-bias matrices, meta-analysis, and PRISMA flow generation are not complete.
- Statistical planning currently produces a structured draft; it does not execute calculations, inspect datasets, or provide a statistical sandbox.
- Protocol, manuscript, reviewer, grant, and reporting-guideline experiences are currently UI entry points and provider/template prompts rather than complete specialist products.
- Project editing is available in the API but not yet exposed as a complete editing flow in the workspace.
- Voice interaction currently supports dictation only; speech output is not implemented.

### Production readiness

- Configure and verify ChatGPT/Sites authentication and authorization policy.
- Provision Cloudflare D1/R2 and apply migrations in the target environment.
- Configure `OPENAI_API_KEY` and optional `OPENAI_MODEL` as runtime secrets.
- Add rate limiting, monitoring, end-to-end tests, structured audit review, and a security/privacy review.
- Establish approved data-handling procedures for sensitive research data and institutional requirements.
- Never place protected health information in prompts without an approved data-processing path.

## Validation snapshot

Validation was run against the repository snapshot on 2026-09-16:

- `npm test`: **passed** — 4 test files, 9 tests.
- `npm run build`: **passed** — deployable build completed.
- `npm run lint`: **not clean** — 8 errors and 12 warnings, concentrated in `app/page.tsx` (unsafe `any` values, hook declaration/order issues, unused imports/state, and image warnings).
- `git diff --check`: **passed**.
- Working tree: **clean** after validation; generated dependency/build directories are ignored.

## Recommended next milestone

1. Fix the `app/page.tsx` lint errors and warnings that affect maintainability.
2. Replace generic evidence fallback claims with a provenance-preserving, source-grounded synthesis pipeline.
3. Build an isolated PDF-processing worker with extraction limits, OCR support, malicious-document screening, and prompt-injection handling.
4. Add end-to-end tests for authentication, retrieval, uploads, analysis persistence, and failure paths.
5. Deploy only after the provider, D1, R2, authentication, privacy, and monitoring configuration has been reviewed.
