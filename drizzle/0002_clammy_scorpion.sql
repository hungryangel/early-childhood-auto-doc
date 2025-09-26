CREATE TABLE `childcare_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_id` integer NOT NULL,
	`date` text NOT NULL,
	`keywords` text NOT NULL,
	`evaluation` text NOT NULL,
	`support_plan` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
