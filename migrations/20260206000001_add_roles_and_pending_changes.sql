-- Add role-based access control
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'editor');

-- Add role column to users table
ALTER TABLE users ADD COLUMN role user_role DEFAULT 'editor';

-- Migrate existing admin users
UPDATE users SET role = 'admin' WHERE admin = TRUE;

-- Keep admin column for now for backwards compatibility
-- Will be removed in future migration

CREATE INDEX idx_users_role ON users(role);

-- Create pending changes table for editor submissions
CREATE TABLE pending_changes (
    id CHAR(24) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- 'scholar', 'news', 'tag', 'identity'
    entity_id CHAR(24), -- NULL for new entities
    action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
    changes JSONB NOT NULL, -- The actual data changes
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    submitted_by CHAR(24) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_by CHAR(24) REFERENCES users(id) ON DELETE SET NULL,
    review_comment TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pending_changes_status ON pending_changes(status);
CREATE INDEX idx_pending_changes_entity ON pending_changes(entity_type, entity_id);
CREATE INDEX idx_pending_changes_submitted_by ON pending_changes(submitted_by);
CREATE INDEX idx_pending_changes_reviewed_by ON pending_changes(reviewed_by);
CREATE INDEX idx_pending_changes_submitted_at ON pending_changes(submitted_at DESC);

-- Add constraint: only pending changes can be updated
ALTER TABLE pending_changes ADD CONSTRAINT check_status_values
    CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE pending_changes ADD CONSTRAINT check_action_values
    CHECK (action IN ('create', 'update', 'delete'));

ALTER TABLE pending_changes ADD CONSTRAINT check_entity_type_values
    CHECK (entity_type IN ('scholar', 'news', 'tag', 'identity'));
