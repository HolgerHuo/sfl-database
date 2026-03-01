-- Add featured flag to tags for homepage sections
ALTER TABLE tags
    ADD COLUMN featured BOOLEAN NOT NULL DEFAULT FALSE;

-- Optimize featured tag lookups
CREATE INDEX idx_tags_featured ON tags(featured) WHERE featured = TRUE;
