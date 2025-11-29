use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Image {
    pub id: String,
    pub filename: String,
    #[serde(rename = "mimeType")]
    pub mime_type: String,
    #[serde(rename = "sizeBytes")]
    pub size_bytes: i32,
    #[serde(rename = "uploadedBy")]
    pub uploaded_by: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ImageRequest {
    #[validate(length(min = 1, max = 30))]
    pub filename: String,
    #[validate(length(min = 1, max = 50))]
    pub mime_type: String,
    #[validate(range(min = 1))]
    pub size_bytes: i32,
}
