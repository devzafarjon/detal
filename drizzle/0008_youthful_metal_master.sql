CREATE TABLE `drawings` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`data` text NOT NULL,
	`part_count` integer NOT NULL,
	`revision` integer NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL
);
