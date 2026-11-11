CREATE TABLE `proxies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(60) NOT NULL,
	`url` varchar(255) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`enabled` boolean NOT NULL DEFAULT true,
	`platforms` varchar(60) NOT NULL DEFAULT 'youtube',
	CONSTRAINT `proxies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `admin` boolean DEFAULT false NOT NULL;