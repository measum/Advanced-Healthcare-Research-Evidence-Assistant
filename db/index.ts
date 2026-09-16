import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let initialized = false;
let initPromise: Promise<void> | null = null;

const D1_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS research_projects (
    id text PRIMARY KEY NOT NULL,
    owner_id text NOT NULL,
    name text NOT NULL,
    question text,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_research_projects_owner_updated ON research_projects (owner_id, updated_at)`,
  `CREATE TABLE IF NOT EXISTS search_runs (
    id text PRIMARY KEY NOT NULL,
    project_id text,
    owner_id text NOT NULL,
    query text NOT NULL,
    provider text NOT NULL,
    created_at integer NOT NULL,
    FOREIGN KEY (project_id) REFERENCES research_projects(id) ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE INDEX IF NOT EXISTS idx_search_runs_owner_created ON search_runs (owner_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS retrieved_sources (
    id text PRIMARY KEY NOT NULL,
    search_run_id text NOT NULL,
    external_id text NOT NULL,
    title text NOT NULL,
    journal text,
    publication_year text,
    doi text,
    pmid text,
    canonical_url text NOT NULL,
    verification_status text DEFAULT 'unverified' NOT NULL,
    FOREIGN KEY (search_run_id) REFERENCES search_runs(id) ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_retrieved_sources_run_external ON retrieved_sources (search_run_id, external_id)`,
  `CREATE TABLE IF NOT EXISTS uploaded_documents (
    id text PRIMARY KEY NOT NULL,
    owner_id text NOT NULL,
    project_id text,
    storage_key text NOT NULL,
    original_name text NOT NULL,
    content_type text NOT NULL,
    byte_size integer NOT NULL,
    processing_status text NOT NULL,
    created_at integer NOT NULL,
    FOREIGN KEY (project_id) REFERENCES research_projects(id) ON UPDATE no action ON DELETE set null
  )`,
  `CREATE INDEX IF NOT EXISTS idx_uploaded_documents_owner_created ON uploaded_documents (owner_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS paper_analyses (
    id text PRIMARY KEY NOT NULL,
    document_id text NOT NULL,
    owner_id text NOT NULL,
    content text NOT NULL,
    model text NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL,
    FOREIGN KEY (document_id) REFERENCES uploaded_documents(id) ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_paper_analyses_document ON paper_analyses (document_id)`,
  `CREATE INDEX IF NOT EXISTS idx_paper_analyses_owner_updated ON paper_analyses (owner_id, updated_at)`,
  `CREATE TABLE IF NOT EXISTS audit_events (
    id text PRIMARY KEY NOT NULL,
    owner_id text NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    created_at integer NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_events_owner_created ON audit_events (owner_id, created_at)`
];

export async function ensureDbInitialized() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      const d1 = env.DB;
      if (!d1) return;
      try {
        for (const sql of D1_SCHEMA_STATEMENTS) {
          await d1.prepare(sql).run();
        }
        initialized = true;
      } catch (e) {
        console.error("Failed to initialize database tables:", e);
      }
    })();
  }
  await initPromise;
}

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding \`DB\` is unavailable. Set the \`d1\` field in .openai/hosting.json to \`DB\` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

export function getDocumentBucket() {
  if (!env.BUCKET) throw new Error("Cloudflare R2 binding is unavailable.");
  return env.BUCKET;
}
