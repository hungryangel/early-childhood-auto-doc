CREATE TABLE `observations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`child_id` integer NOT NULL,
	`user_id` text,
	`date` text NOT NULL,
	`time` text,
	`domain` text NOT NULL,
	`tags` text DEFAULT '[]',
	`summary` text NOT NULL,
	`detail` text,
	`media` text DEFAULT '[]',
	`author` text NOT NULL,
	`follow_ups` text DEFAULT '[]',
	`linked_to_report` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE no action
);
