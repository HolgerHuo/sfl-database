use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::sync::LazyLock;
use validator::Validate;

#[derive(Debug, Deserialize)]
pub struct TagListParams {
    pub featured: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub featured: bool,
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
pub struct TagRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
    pub description: Option<String>,
    #[validate(regex(path = *COLOR_REGEX))]
    pub color: Option<String>,
    pub featured: Option<bool>,
    #[serde(rename = "displayOrder")]
    pub display_order: Option<i32>,
}

static COLOR_REGEX: LazyLock<regex::Regex> =
    LazyLock::new(|| regex::Regex::new(r"^#[0-9A-Fa-f]{6}$").unwrap());

#[derive(Debug, Clone, Serialize)]
pub struct TagListItem {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub featured: bool,
    #[serde(rename = "displayOrder")]
    pub display_order: i32,
}

#[derive(Debug, Serialize)]
pub struct TagResponse {
    #[serde(flatten)]
    pub tag: Tag,
    #[serde(rename = "scholars")]
    pub scholars: Vec<super::ScholarInfo>,
}

#[derive(Debug, Serialize)]
pub struct TagDetailResponse {
    #[serde(flatten)]
    pub tag: Tag,
    #[serde(rename = "scholars")]
    pub scholars: Vec<super::ScholarInfo>,
    pub pagination: super::Pagination,
}

#[derive(Debug, Serialize)]
pub struct TagListResponse {
    pub data: Vec<TagResponse>,
}
