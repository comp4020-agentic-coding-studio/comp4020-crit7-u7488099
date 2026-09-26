CREATE TABLE `course_offerings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_code` text NOT NULL,
	`year` integer NOT NULL,
	`semester` text NOT NULL,
	FOREIGN KEY (`course_code`) REFERENCES `courses`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `course_prerequisites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_code` text NOT NULL,
	`prerequisite_code` text NOT NULL,
	FOREIGN KEY (`course_code`) REFERENCES `courses`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prerequisite_code`) REFERENCES `courses`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`code` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`units` integer DEFAULT 6 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `degrees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `degrees_code_unique` ON `degrees` (`code`);--> statement-breakpoint
CREATE TABLE `plan_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_code` text NOT NULL,
	`year` integer NOT NULL,
	`semester` text NOT NULL,
	`requirement_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`course_code`) REFERENCES `courses`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requirement_id`) REFERENCES `requirements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `requirement_courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requirement_id` integer NOT NULL,
	`course_code` text NOT NULL,
	`mandatory` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`requirement_id`) REFERENCES `requirements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_code`) REFERENCES `courses`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `requirements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`degree_id` integer NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`degree_id`) REFERENCES `degrees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `requirements_code_unique` ON `requirements` (`code`);