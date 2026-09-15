CREATE TABLE `research_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`question` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_research_projects_owner_updated` ON `research_projects` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `retrieved_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`search_run_id` text NOT NULL,
	`external_id` text NOT NULL,
	`title` text NOT NULL,
	`journal` text,
	`publication_year` text,
	`doi` text,
	`pmid` text,
	`canonical_url` text NOT NULL,
	FOREIGN KEY (`search_run_id`) REFERENCES `search_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_retrieved_sources_run_external` ON `retrieved_sources` (`search_run_id`,`external_id`);--> statement-breakpoint
CREATE TABLE `search_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`owner_id` text NOT NULL,
	`query` text NOT NULL,
	`provider` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `research_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_search_runs_owner_created` ON `search_runs` (`owner_id`,`created_at`);