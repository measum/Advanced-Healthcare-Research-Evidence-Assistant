ALTER TABLE `retrieved_sources` ADD `authors` text;--> statement-breakpoint
ALTER TABLE `retrieved_sources` ADD `publication_type` text;--> statement-breakpoint
ALTER TABLE `retrieved_sources` ADD `abstract` text;--> statement-breakpoint
ALTER TABLE `retrieved_sources` ADD `pmcid` text;--> statement-breakpoint
ALTER TABLE `retrieved_sources` ADD `full_text_url` text;--> statement-breakpoint
ALTER TABLE `retrieved_sources` ADD `full_text_available` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `retrieved_sources` ADD `verification_reason` text;--> statement-breakpoint
ALTER TABLE `retrieved_sources` ADD `retrieved_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `uploaded_documents` ADD `extraction_error` text;--> statement-breakpoint
ALTER TABLE `uploaded_documents` ADD `page_count` integer;--> statement-breakpoint
ALTER TABLE `uploaded_documents` ADD `extracted_at` integer;