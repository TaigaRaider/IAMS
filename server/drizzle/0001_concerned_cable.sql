CREATE TABLE `intern_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`intern_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`due_date` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`intern_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
