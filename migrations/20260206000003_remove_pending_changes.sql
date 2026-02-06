-- Remove pending changes system and review logic
-- Keep featured field

DROP TABLE IF EXISTS pending_changes CASCADE;
DROP TYPE IF EXISTS pending_change_status CASCADE;
DROP TYPE IF EXISTS entity_type CASCADE;
DROP TYPE IF EXISTS pending_change_action CASCADE;

-- Remove reviewed column only (keep featured)
ALTER TABLE scholars DROP COLUMN IF EXISTS reviewed;
