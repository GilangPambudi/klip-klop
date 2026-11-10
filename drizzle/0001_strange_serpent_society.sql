CREATE TABLE `config` (
	`name` varchar(40) NOT NULL,
	`value` varchar(255) NOT NULL,
	CONSTRAINT `config_name` PRIMARY KEY(`name`)
);
--> statement-breakpoint
-- Starting values, so the rows are there to edit. They match the fallbacks in src/lib/db/config.ts.
INSERT INTO `config` (`name`, `value`) VALUES
	('default_height', 'max'),
	('default_theme', 'mono-light'),
	('retention_hours', '24');
