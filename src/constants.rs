pub const OIDC_SESSION_EXPIRY_SECS: i64 = 300; // 5 minutes
pub const JWT_ACCESS_TOKEN_EXPIRY_SECS: i64 = 900; // 15 minutes
pub const REFRESH_TOKEN_EXPIRY_SECS: i64 = 604800; // 7 days
pub const MAX_REFRESH_TOKENS_PER_USER: i32 = 5;
pub const OIDC_SESSION_COOKIE_NAME: &str = "oidc_session";
pub const REFRESH_TOKEN_COOKIE_NAME: &str = "refresh_token";
