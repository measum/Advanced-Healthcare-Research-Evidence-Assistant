# AIOTIE Research Chatbot — Project Status

**Last updated:** 2026-09-16
**Repository snapshot:** `arena/01a0a9f1-advanced-healthcare-research-e` (working milestone)
**Primary user:** Dr. Usman Iqabl
**Overall status:** The prototype has been hardened and extended with a source-grounded retrieval foundation, evidence-supported gap detection, safe PDF lifecycle states, bounded descriptive statistics, and clean validation. It is not yet a production-complete research platform: OCR, isolated document workers, full systematic review workflows, broad statistical methods, manuscript persistence, observability, and deployment configuration remain.

## Implemented in this milestone

### Evidence-grounded retrieval

- Europe PMC is now the only literature retrieval source in the deterministic path.
- Fabricated/random citation fallback records were removed.
- External retrieval failure returns an empty result and a transparent no-evidence response.
- Results are normalized, deduplicated by PMID/DOI/title, ranked against query terms, and bounded to a maximum of 20 records.
- Returned metadata now preserves, when available:
  - title
  - authors
  - journal
  - year
  - PMID
  - PMCID
  - DOI
  - publication type
  - abstract
  - canonical URL
  - full-text URL and availability
  - retrieval timestamp
- Crossref verification is strict. A Crossref outage is never treated as DOI verification.
- Verification includes an explicit reason and timestamp.
- Open-access Europe PMC full text can be retrieved for a small, bounded set of PMCID records using a fixed provider URL. Arbitrary URLs are rejected to reduce SSRF risk.
- Full text is supplied to the server-side grounded synthesis path but is not returned wholesale to the browser or persisted in the evidence library.
- The deterministic synthesis fallback reports retrieval status and provenance only. It no longer creates generic effect sizes, sample sizes, p values, confidence intervals, clinical conclusions, or guideline claims.
- When `OPENAI_API_KEY` is configured and abstracts/full text are available, the Responses API receives a source packet and is instructed to cite packet identifiers, state missing information, and describe disagreement rather than infer unsupported results.

### Evidence-supported research gaps and ideas

- Added `POST /api/research/gaps`.
- Gap detection is limited to signals observable in the actual retrieval set, including:
  - missing abstracts
  - unavailable full text
  - limited reported publication-type diversity
  - abstract language indicating uncertainty, heterogeneity, or conflict
  - insufficient structured information for a defensible gap
- Each gap includes its observed evidence, potential question, uncertainty label, and supporting source records.
- Added the Ideas workflow action **Find evidence-supported gaps** and a **What should I research next?** experience.
- Opportunities are explicitly labeled as opportunities, not established priorities.
- Static unsupported feasibility scores, publication counts, growth percentages, regulatory alerts, and clinical outcome claims were removed from the visible intelligence UI.
- Map/trends/signals views now display an explicit insufficient-data state until a live indexed search supplies metrics.

### Secure PDF lifecycle and appraisal boundary

- Added bounded PDF inspection and processing limits:
  - 25 MB maximum input
  - 2,000 page processing limit
  - 2,000,000 extracted-character limit
  - extraction timeouts around analysis
- Suspicious PDF active-content markers are rejected before private storage, including JavaScript, launch actions, form-submission actions, and embedded executable content.
- Extracted document content is treated as untrusted data in model instructions.
- Document processing statuses now include:
  - `uploaded`
  - `processing`
  - `extracted`
  - `ocr_required`
  - `completed`
  - `failed`
  - `rejected`
- Extraction errors, page count, and extraction time are persisted where available.
- The deterministic paper appraisal fallback reports `Not reported` instead of inventing study design, sample size, effect estimates, risk-of-bias ratings, or safety findings.
- Model-backed appraisal is instructed to use only the uploaded paper, reject instructions inside the document, and preserve missing fields as `Not reported`.
- Document deletion is owner-scoped and now requires a browser confirmation.

### Descriptive statistics foundation

- Added `POST /api/statistics` for bounded JSON-row dataset inspection.
- Added safe local calculations for:
  - variable type detection
  - observed/missing counts
  - unique-value counts
  - numeric N
  - mean
  - median
  - sample standard deviation
  - minimum and maximum
- Non-numeric values are not silently coerced into numbers.
- The UI now has a Statistics & Data modal that accepts JSON object rows and displays the transparent calculation output and limitations.
- No numerical result is generated without user-provided data.

### Workspace and stability

- Fixed the original `app/page.tsx` lint errors:
  - unsafe browser Speech Recognition `any` usage
  - functions referenced before declaration in the initial data effect
  - unused imports and state
  - unoptimized logo images
- Added typed browser Speech Recognition interfaces.
- Added project editing in the existing project modal using the existing owner-scoped `PATCH /api/projects` route.
- Added project and document deletion confirmations.
- Local development keeps the default researcher identity only outside production; production requests with missing identity headers are unauthenticated.
- Fixed the Vite configuration type error so standalone TypeScript checking passes.

## Database changes

Migration added:

- `drizzle/0005_productive_rachel_grey.sql`

The migration extends retrieved source records with authors, publication type, abstract, PMCID, full-text metadata, verification reason, and retrieval timestamp. It extends uploaded document records with extraction error, page count, and extraction timestamp.

`db/index.ts` also contains additive compatibility statements for existing local preview databases. Deployed environments should apply the generated migration in order.

## Current API surface

| Route | Purpose |
| --- | --- |
| `POST /api/research` | Routes a workflow, retrieves Europe PMC records, verifies DOI metadata, retrieves bounded Open Access full text when available, optionally persists the evidence packet, and returns a grounded synthesis or transparent retrieval report. |
| `POST /api/research/gaps` | Retrieves and verifies literature, identifies only observable evidence gaps, creates uncertainty-labeled research opportunities, and optionally persists the search. |
| `GET, POST, PATCH, DELETE /api/projects` | Lists, creates, updates, and deletes owner-scoped research projects. |
| `GET, POST, DELETE /api/documents` | Lists, validates, scans, uploads, and deletes owner-scoped PDF documents. |
| `GET, POST /api/documents/:id/analyze` | Reads a saved appraisal or processes an uploaded paper with extraction/status tracking. |
| `GET /api/library` | Lists the signed-in researcher’s saved source metadata and verification state. |
| `POST /api/statistics` | Runs bounded descriptive inspection on a user-provided JSON dataset. |

## Validation snapshot

Validation was run after the milestone changes on 2026-09-16:

- `npm test`: **passed** — 7 test files, 19 tests.
- `npm run lint`: **passed** — no errors or warnings.
- `npm run build`: **passed** — deployable build completed.
- `npx tsc --noEmit`: **passed**.
- `git diff --check`: **passed** for the source changes before commit.

## Remaining blockers — not complete yet

### Full-text processing

- OCR for scanned PDFs is not implemented. The application correctly moves textless documents to `ocr_required` rather than pretending extraction succeeded.
- Extraction is not yet an isolated worker or sandbox with an independently enforced memory limit.
- Page-level provenance is approximate for PDFs with multiple content streams.
- Malformed/encrypted PDF handling needs a dedicated production parser and security review.
- A provider-assisted OCR path still requires deployment configuration and a reviewed data-processing agreement.

### Research workflows

- Systematic-review screening, deduplication, full-text decisions, extraction tables, risk-of-bias matrices, meta-analysis, GRADE, and PRISMA export are not end-to-end products.
- Statistics currently provides descriptive dataset inspection only. Inferential tests, regression, survival, causal inference, multiple imputation, power calculations, dataset upload formats, and analysis export remain to be implemented and independently tested.
- Protocol generation, manuscript workspace, reviewer mode, grant support, reporting-guideline checklists, and research packages remain mostly UI entry points or draft templates rather than persisted end-to-end workflows.
- Evidence-grounded opportunity detection is retrieval-set level, not a complete systematic review and not a field-wide novelty guarantee.
- Research memory is currently session/UI-oriented and does not yet provide complete persistent view/edit/export/delete controls.
- Voice currently provides optional browser dictation; transcription persistence and text-to-speech are not implemented.

### Production/security/operations

- Configure and verify hosted authentication and authorization policy.
- Apply D1 migrations and provision private R2 in the target environment.
- Configure `OPENAI_API_KEY` and optional `OPENAI_MODEL` as runtime secrets.
- Add rate limiting, request tracing, monitoring, alerting, and structured audit review.
- Add authenticated integration and end-to-end tests, including IDOR, cross-user document access, provider failure, storage failure, malformed PDF, active-content PDF, and prompt-injection cases.
- Complete SSRF, XSS, CSRF, abuse, privacy, PHI, dependency, and deployment security review.
- Establish approved data-handling procedures before sending sensitive research data to an external model provider.

## Recommended next implementation order

1. Build an isolated document worker with OCR, page-level extraction provenance, and a reviewed malicious-document pipeline.
2. Add persisted evidence-extraction records and claim-level source/page references.
3. Implement systematic-review state and screening/extraction exports.
4. Expand the statistics engine with tested calculations and a safe dataset workspace.
5. Add persistent protocol, manuscript, reviewer, memory, and research-package entities.
6. Add authenticated integration/E2E tests and production observability.
7. Deploy only after D1, R2, authentication, provider secrets, privacy, and security review are complete.

**Important:** This status intentionally does not call the product complete. Major workflows remain clearly marked as unavailable or draft-only until they perform real, source-grounded, persisted work.
