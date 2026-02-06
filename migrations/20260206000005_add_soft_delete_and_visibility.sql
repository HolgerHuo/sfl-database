-- Add soft delete and visibility columns to scholars table
ALTER TABLE scholars
    ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN visible BOOLEAN NOT NULL DEFAULT TRUE;

-- Add index for common queries
CREATE INDEX idx_scholars_deleted ON scholars(deleted);
CREATE INDEX idx_scholars_visible ON scholars(visible);
