use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use super::{Pagination, PaginationParams};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "user_role", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Moderator,
    Editor,
}

impl UserRole {
    pub fn can_approve(&self) -> bool {
        matches!(self, UserRole::Admin | UserRole::Moderator)
    }

    pub fn can_manage_roles(&self) -> bool {
        matches!(self, UserRole::Admin)
    }

    pub fn is_admin(&self) -> bool {
        matches!(self, UserRole::Admin)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: String,
    #[serde(skip_serializing)]
    pub oidc_sub: String,
    pub email: String,
    pub name: Option<String>,
    pub role: UserRole,
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
    pub role: Option<UserRole>,
    pub active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UserUpdateInput {
    pub role: Option<UserRole>,
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
    #[sqlx(rename = "account")]
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
    pub role: UserRole,
    pub exp: i64,
    pub iat: i64,
}

impl Claims {
    pub fn can_approve(&self) -> bool {
        self.role.can_approve()
    }

    pub fn can_manage_roles(&self) -> bool {
        self.role.can_manage_roles()
    }

    pub fn is_admin(&self) -> bool {
        self.role.is_admin()
    }

    pub fn is_editor(&self) -> bool {
        self.role == UserRole::Editor
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
}
