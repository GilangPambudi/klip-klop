CREATE TABLE `downloads` (
	`token` varchar(24) NOT NULL,
	`user_id` varchar(80) NOT NULL,
	`file` varchar(255) NOT NULL,
	`source_url` varchar(512) NOT NULL,
	`start_time` varchar(8) NOT NULL,
	`end_time` varchar(8) NOT NULL,
	`format` varchar(8) NOT NULL,
	`created_at` datetime NOT NULL,
	`expires_at` datetime NOT NULL,
	CONSTRAINT `downloads_token` PRIMARY KEY(`token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(80) NOT NULL,
	`provider` varchar(20) NOT NULL,
	`name` varchar(100) NOT NULL,
	`image` varchar(512),
	`credits` int NOT NULL DEFAULT 3,
	`unlimited` boolean NOT NULL DEFAULT false,
	`banned` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	`last_login_at` datetime NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `downloads` ADD CONSTRAINT `downloads_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `downloads_user_idx` ON `downloads` (`user_id`);