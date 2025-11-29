use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Identity {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(rename = "displayOrder")]
    pub display_order: i32,
    #[serde(skip_serializing_if = "Option::is_none", rename = "createdBy")]
    pub created_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "updatedBy")]
    pub updated_by: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "archivedAt")]
    pub archived_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct IdentityRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
    pub description: Option<String>,
    #[serde(rename = "displayOrder")]
    pub display_order: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct IdentityListResponse {
    pub data: Vec<Identity>,
}
