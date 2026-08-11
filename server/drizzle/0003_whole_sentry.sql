ALTER TABLE `users` ADD `is_deactivated` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `is_deleted` integer DEFAULT 0 NOT NULL;