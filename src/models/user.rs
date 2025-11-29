use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use super::{Pagination, PaginationParams};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: String,
    #[serde(skip_serializing)]
    pub oidc_sub: String,
    pub email: String,
    pub name: Option<String>,
    pub admin: bool,
    pub active: bool,
    #[serde(rename = "lastLogin")]
    pub last_login: Option<DateTime<Utc>>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UserQueryParams {
    #[serde(flatten)]
    pub pagination: PaginationParams,
    pub admin: Option<bool>,
    pub active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UserUpdateInput {
    pub admin: Option<bool>,
    pub active: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct UserListResponse {
    pub data: Vec<User>,
    pub pagination: Pagination,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "refreshToken")]
    pub refresh_token: String,
    #[serde(rename = "expiresIn")]
    pub expires_in: i64,
    #[serde(rename = "tokenType")]
    pub token_type: String,
    pub user: User,
}

#[derive(Debug, Serialize)]
pub struct TokenResponse {
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "expiresIn")]
    pub expires_in: i64,
    #[serde(rename = "tokenType")]
    pub token_type: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RefreshToken {
    pub id: String,
    #[serde(rename = "user")]
    pub user: String,
    pub token_hash: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub user_id: String,
    pub email: String,
    pub admin: bool,
    pub exp: i64,
    pub iat: i64,
}
