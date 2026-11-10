-- The default theme now follows the visitor's device: "mono" means mono-light or
-- mono-dark, whichever the device asks for. Only the untouched starting value is
-- changed; a theme someone chose on purpose stays.
UPDATE `config` SET `value` = 'mono' WHERE `name` = 'default_theme' AND `value` = 'mono-light';
