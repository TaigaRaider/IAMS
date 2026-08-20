CREATE TABLE `intern_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`doc_type` text DEFAULT 'other' NOT NULL,
	`file_name` text NOT NULL,
	`stored_path` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `intern_documents_user_idx` ON `intern_documents` (`user_id`);--> statement-breakpoint
CREATE INDEX `intern_documents_type_idx` ON `intern_documents` (`user_id`,`doc_type`);