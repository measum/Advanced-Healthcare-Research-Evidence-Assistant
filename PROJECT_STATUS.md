# Aurelia Research - Project Status

**Status:** Foundation complete; advanced platform implementation in progress.

## Completed

### Workspace and UX

- Responsive healthcare research workspace.
- Evidence Synthesis, Paper Analysis, Protocol Builder, and Statistical Planning modes.
- Project sidebar, research composer, evidence desk, document queue, and source-verification indicators.
- Transparent specialist-workflow routing.

### Evidence retrieval and verification

- Live bibliographic retrieval through Europe PMC.
- Canonical PubMed/Europe PMC links.
- Crossref DOI verification for DOI-bearing records.
- Explicit verified or unverified citation status.
- Evidence-safety behavior: metadata is not presented as clinical conclusions.

### Persistence and security

- Authenticated, owner-scoped D1 project storage.
- Persistent search-run and retrieved-source records.
- Authenticated evidence library API.
- Private R2 PDF upload path with PDF-only validation and a 25 MB maximum size.
- Durable document metadata and queued processing status.
- Generated D1 migrations for projects, searches, sources, and documents.
- Server-side validation, bounded request sizes, and safe storage-failure handling.

### Model and orchestration

- Server-side OpenAI Responses API adapter.
- Runtime-secret-only model configuration; no browser API key exposure.
- Provider requests use store: false.
- Research safety instructions prohibit invented studies, citations, results, guidelines, and patient-specific advice.
- Research, Critical Appraisal, Protocol, and Statistics workflow routing.

### Validation

- Current production build passes.
- Working tree is committed through the evidence-library implementation.

## In Progress / Not Yet Implemented

### Document and paper analysis

- Isolated PDF text extraction and OCR.
- Malicious-document and prompt-injection screening.
- Structured Paper Analysis output from uploaded papers.
- Full-text evidence extraction.

### Research workflows

- Source-grounded evidence synthesis from full text.
- Citation formatting, export, and reference-manager integration.
- Systematic review workflow: screening, deduplication, extraction, risk of bias, synthesis, and PRISMA flow.
- Statistical computation, data inspection, sample-size calculations, and analysis sandbox.
- Manuscript writing, reviewer mode, grant-writing, and reporting-guideline tools.

### Workspace expansion

- Project editing/deletion and confirmation flows.
- Tasks, deadlines, meeting notes, research timeline, and reminders.
- User-controlled memory view, edit, export, and deletion.
- Voice interaction and approved browser automation.

### Production readiness

- Deploy the application.
- Apply D1 migrations and provision R2.
- Configure authentication access policy.
- Configure the OPENAI_API_KEY and optional OPENAI_MODEL runtime secrets.
- Add automated tests, end-to-end tests, monitoring, audit logs, rate limiting, and security review.
- Establish data-handling procedures for sensitive research data and institutional requirements.

## Current API Surface

| Route | Purpose |
| --- | --- |
| POST /api/research | Routes a request, retrieves live literature, verifies DOI metadata, and saves authenticated search history. |
| GET, POST /api/projects | Lists and creates authenticated research projects. |
| GET, POST /api/documents | Lists and uploads authenticated PDF documents. |
| GET /api/library | Lists the signed-in researcher's saved source history. |

## Required Next Milestone

Build an isolated document-processing worker that extracts PDF text safely, records extraction outcomes, and supplies a bounded, provenance-preserving input to the Paper Analysis workflow.
