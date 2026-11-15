CREATE TABLE `blocked_ips` (
	`ip` varchar(45) NOT NULL,
	`reason` varchar(255) NOT NULL DEFAULT '',
	`created_at` datetime NOT NULL,
	`expires_at` datetime NOT NULL,
	CONSTRAINT `blocked_ips_ip` PRIMARY KEY(`ip`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`type` varchar(20) NOT NULL,
	`ip` varchar(45) NOT NULL,
	`user_id` varchar(80),
	`detail` varchar(255),
	`created_at` datetime NOT NULL,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `events_created_idx` ON `events` (`created_at`);--> statement-breakpoint
CREATE INDEX `events_ip_idx` ON `events` (`ip`,`created_at`);