CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_scholars_name_trgm
    ON scholars USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_scholars_field_of_research_trgm
    ON scholars USING GIN (field_of_research gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_scholars_introduction_trgm
    ON scholars USING GIN (introduction gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_scholars_social_influence_trgm
    ON scholars USING GIN (social_influence gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tags_name_trgm
    ON tags USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tags_description_trgm
    ON tags USING GIN (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_identities_name_trgm
    ON identities USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_identities_description_trgm
    ON identities USING GIN (description gin_trgm_ops);
