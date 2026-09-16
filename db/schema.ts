import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const researchProjects = sqliteTable("research_projects", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  question: text("question"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [index("idx_research_projects_owner_updated").on(table.ownerId, table.updatedAt)]);

export const searchRuns = sqliteTable("search_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => researchProjects.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull(),
  query: text("query").notNull(),
  provider: text("provider").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [index("idx_search_runs_owner_created").on(table.ownerId, table.createdAt)]);

export const retrievedSources = sqliteTable("retrieved_sources", {
  id: text("id").primaryKey(),
  searchRunId: text("search_run_id").notNull().references(() => searchRuns.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(),
  title: text("title").notNull(),
  authors: text("authors"),
  journal: text("journal"),
  publicationYear: text("publication_year"),
  publicationType: text("publication_type"),
  abstract: text("abstract"),
  doi: text("doi"),
  pmid: text("pmid"),
  pmcid: text("pmcid"),
  canonicalUrl: text("canonical_url").notNull(),
  fullTextUrl: text("full_text_url"),
  fullTextAvailable: integer("full_text_available", { mode: "boolean" }).notNull().default(false),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  verificationReason: text("verification_reason"),
  retrievedAt: integer("retrieved_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("idx_retrieved_sources_run_external").on(table.searchRunId, table.externalId),
]);

export const uploadedDocuments = sqliteTable("uploaded_documents", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  projectId: text("project_id").references(() => researchProjects.id, { onDelete: "set null" }),
  storageKey: text("storage_key").notNull(),
  originalName: text("original_name").notNull(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  processingStatus: text("processing_status").notNull(),
  extractionError: text("extraction_error"),
  pageCount: integer("page_count"),
  extractedAt: integer("extracted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [index("idx_uploaded_documents_owner_created").on(table.ownerId, table.createdAt)]);

export const paperAnalyses = sqliteTable("paper_analyses", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => uploadedDocuments.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull(),
  content: text("content").notNull(),
  model: text("model").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("idx_paper_analyses_document").on(table.documentId),
  index("idx_paper_analyses_owner_updated").on(table.ownerId, table.updatedAt),
]);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [index("idx_audit_events_owner_created").on(table.ownerId, table.createdAt)]);
