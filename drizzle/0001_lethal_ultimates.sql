CREATE TABLE `activity_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_id` integer NOT NULL,
	`theme` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`age` text NOT NULL,
	`plans` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
