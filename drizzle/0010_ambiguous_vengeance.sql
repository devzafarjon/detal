CREATE TABLE `ai_jobs` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`model` text NOT NULL,
	`tiles` text NOT NULL,
	`status` text NOT NULL,
	`response_id` text,
	`result` text,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
