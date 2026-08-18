CREATE TABLE `text_files` (
	`file_id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`blocks` integer NOT NULL,
	`packet_count` integer NOT NULL,
	`manifest` text NOT NULL,
	`status` text DEFAULT 'stored' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `text_packets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_id` text NOT NULL,
	`seq` integer NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'ok' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `text_files`(`file_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `text_packets_file_idx` ON `text_packets` (`file_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `text_packets_file_seq_unique` ON `text_packets` (`file_id`,`seq`);