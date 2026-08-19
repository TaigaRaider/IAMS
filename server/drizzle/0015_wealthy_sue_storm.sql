DROP INDEX `users_email_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_active_unique` ON `users` (`email`) WHERE "users"."is_deleted" = 0;