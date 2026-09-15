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
  journal: text("journal"),
  publicationYear: text("publication_year"),
  doi: text("doi"),
  pmid: text("pmid"),
  canonicalUrl: text("canonical_url").notNull(),
}, (table) => [
  uniqueIndex("idx_retrieved_sources_run_external").on(table.searchRunId, table.externalId),
]);
