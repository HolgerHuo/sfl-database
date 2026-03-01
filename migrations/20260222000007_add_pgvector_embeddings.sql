-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to scholars table
-- Using vector(1536) to match OpenAI's text-embedding-3-small model dimensionality
ALTER TABLE scholars ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);

-- Create index for efficient vector similarity search
CREATE INDEX IF NOT EXISTS idx_scholars_embedding ON scholars
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create a table to track embedding metadata
CREATE TABLE IF NOT EXISTS scholar_embeddings (
    id CHAR(24) PRIMARY KEY,
    scholar_id CHAR(24) NOT NULL UNIQUE REFERENCES scholars(id) ON DELETE CASCADE,
    -- Concatenated text used for embedding (for reference)
    embedding_text TEXT NOT NULL,
    -- The actual embedding vector
    embedding VECTOR(1536) NOT NULL,
    -- Track when embedding was created for freshness
    embedded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scholar_embeddings_embedding ON scholar_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_scholar_embeddings_scholar_id ON scholar_embeddings(scholar_id);
