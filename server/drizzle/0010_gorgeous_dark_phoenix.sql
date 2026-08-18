CREATE TABLE `onboarding_steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`step_key` text NOT NULL,
	`label` text NOT NULL,
	`done` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `onboarding_user_idx` ON `onboarding_steps` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `onboarding_user_step_unique` ON `onboarding_steps` (`user_id`,`step_key`);--> statement-breakpoint
ALTER TABLE `users` ADD `cover_letter` text;