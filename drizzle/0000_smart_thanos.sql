CREATE TABLE `assessments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`overall` integer NOT NULL,
	`ease` integer NOT NULL,
	`usefulness` integer NOT NULL,
	`comment` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` text NOT NULL,
	`role` text NOT NULL,
	`body` text NOT NULL,
	`reason` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`line_user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`urgency` text DEFAULT 'green' NOT NULL,
	`status` text DEFAULT 'awaiting_staff' NOT NULL,
	`age` integer,
	`procedure` text,
	`discharge_day` integer,
	`intake_field` text,
	`intake_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `patients_line_user_id_unique` ON `patients` (`line_user_id`);