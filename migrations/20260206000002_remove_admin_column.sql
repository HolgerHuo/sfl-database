-- Remove the redundant admin column from users table
-- The role column is sufficient for role-based access control

ALTER TABLE users DROP COLUMN IF EXISTS admin;
