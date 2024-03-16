-- Shinobi will create the database framework on start.
-- Be certain the database exists and Shinobi can access it.

-- Create Database
CREATE DATABASE IF NOT EXISTS `ccio`;
-- Create User for Database
CREATE USER 'majesticflame'@'localhost' IDENTIFIED BY '';
-- Grant Permissions to User for Database
GRANT ALL PRIVILEGES ON ccio.* TO 'majesticflame'@'localhost';
-- Refresh SQL Authorization
FLUSH PRIVILEGES;
