CREATE TABLE `paper_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`content` text NOT NULL,
	`model` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `uploaded_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_paper_analyses_document` ON `paper_analyses` (`document_id`);--> statement-breakpoint
CREATE INDEX `idx_paper_analyses_owner_updated` ON `paper_analyses` (`owner_id`,`updated_at`);