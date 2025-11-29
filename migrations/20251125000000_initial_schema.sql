-- enums
CREATE TYPE gender AS ENUM ('M', 'F');

-- users
CREATE TABLE users (
    id CHAR(24) PRIMARY KEY,
    oidc_sub VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name TEXT,
    admin BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_active ON users(active) WHERE active = FALSE;

-- access tokens
CREATE TABLE access_tokens (
    id CHAR(24) PRIMARY KEY,
    account CHAR(24) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_access_tokens_user ON access_tokens(account);
CREATE INDEX idx_access_tokens_token_hash ON access_tokens(token_hash);
CREATE INDEX idx_access_tokens_expires_at ON access_tokens(expires_at);

-- refresh tokens
CREATE TABLE refresh_tokens (
    id CHAR(24) PRIMARY KEY,
    account CHAR(24) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(account);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- identities
CREATE TABLE identities (
    id CHAR(24) PRIMARY KEY,
    name VARCHAR(10) UNIQUE NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_by CHAR(24) REFERENCES users(id) ON DELETE SET NULL,
    updated_by CHAR(24) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_identities_display_order ON identities(display_order);
CREATE INDEX idx_identities_updated_by ON identities(updated_by);

-- tags
CREATE TABLE tags (
    id CHAR(24) PRIMARY KEY,
    name VARCHAR(10) UNIQUE NOT NULL,
    description TEXT,
    color CHAR(6),
    display_order INTEGER DEFAULT 0,
    created_by CHAR(24) REFERENCES users(id) ON DELETE SET NULL,
    updated_by CHAR(24) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_tags_display_order ON tags(display_order);
CREATE INDEX idx_tags_updated_by ON tags(updated_by);

-- news
CREATE TABLE news (
    id CHAR(24) PRIMARY KEY,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    publish_date TIMESTAMPTZ NOT NULL,
    created_by CHAR(24) REFERENCES users(id) ON DELETE SET NULL,
    updated_by CHAR(24) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_news_publish_date ON news(publish_date DESC);
CREATE INDEX idx_news_updated_by ON news(updated_by);

-- images
CREATE TABLE images (
    id CHAR(24) PRIMARY KEY,
    filename VARCHAR(30) NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
    uploaded_by CHAR(24) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_images_uploaded_by ON images(uploaded_by);

-- scholars
CREATE TABLE scholars (
    id CHAR(24) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    gender gender NOT NULL,
    field_of_research VARCHAR(25) NOT NULL,
    year_of_birth INTEGER NOT NULL,
    image CHAR(24) REFERENCES images(id) ON DELETE SET NULL,
    introduction TEXT NOT NULL,
    social_influence TEXT NOT NULL,
    featured BOOLEAN DEFAULT FALSE,
    reviewed BOOLEAN DEFAULT FALSE,
    identity CHAR(24) NOT NULL REFERENCES identities(id),
    version INTEGER DEFAULT 1 CHECK (version > 0),
    locked_by CHAR(24) REFERENCES users(id) ON DELETE SET NULL,
    locked_at TIMESTAMPTZ,
    created_by CHAR(24) REFERENCES users(id) ON DELETE SET NULL,
    updated_by CHAR(24) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_scholars_reviewed ON scholars(reviewed);
CREATE INDEX idx_scholars_featured ON scholars(featured) WHERE featured = TRUE;
CREATE INDEX idx_scholars_identity ON scholars(identity);
CREATE INDEX idx_scholars_image ON scholars(image);
CREATE INDEX idx_scholars_locked_by ON scholars(locked_by);
CREATE INDEX idx_scholars_updated_by ON scholars(updated_by);
CREATE INDEX idx_scholars_reviewed_featured ON scholars(reviewed, featured) WHERE reviewed = TRUE AND featured = TRUE;
CREATE INDEX idx_scholars_name ON scholars(name);
CREATE INDEX idx_scholars_year_of_birth ON scholars(year_of_birth);
CREATE INDEX idx_scholars_gender ON scholars(gender);

-- scholar tags
CREATE TABLE scholar_tags (
    scholar CHAR(24) NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
    tag CHAR(24) NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (scholar, tag)
);

CREATE INDEX idx_scholar_tags_tag ON scholar_tags(tag);

-- news scholars
CREATE TABLE news_scholars (
    news CHAR(24) NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    scholar CHAR(24) NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (news, scholar)
);

CREATE INDEX idx_news_scholars_scholar ON news_scholars(scholar);

-- scholar history
CREATE TABLE scholar_history (
    id CHAR(24) PRIMARY KEY,
    scholar CHAR(24) NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1 CHECK (version > 0),
    values JSONB NOT NULL,
    updated_by CHAR(24) REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (scholar, version)
);

CREATE INDEX idx_scholar_history_scholar ON scholar_history(scholar);
CREATE INDEX idx_scholar_history_updated_by ON scholar_history(updated_by);
CREATE INDEX idx_scholar_history_updated_at ON scholar_history(updated_at DESC);
