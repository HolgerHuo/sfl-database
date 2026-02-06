-- Remove locking system
ALTER TABLE scholars DROP COLUMN IF EXISTS locked_by;
ALTER TABLE scholars DROP COLUMN IF EXISTS locked_at;
