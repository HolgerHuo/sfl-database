use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use validator::Validate;

use super::{Pagination, PaginationParams};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct News {
    pub id: String,
    pub title: String,
    pub source: String,
    pub url: String,
    #[serde(rename = "publishDate")]
    pub publish_date: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "createdBy")]
    pub created_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "updatedBy")]
    pub updated_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "archivedAt")]
    pub archived_at: Option<DateTime<Utc>>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct NewsResponse {
    #[serde(flatten)]
    pub news: News,
    #[serde(rename = "scholarIds")]
    pub scholar_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct NewsRequest {
    #[validate(length(min = 1, max = 500))]
    pub title: String,
    #[validate(length(min = 1, max = 255))]
    pub source: String,
    #[validate(url)]
    #[validate(length(min = 1, max = 1000))]
    pub url: String,
    #[serde(rename = "publishDate")]
    pub publish_date: DateTime<Utc>,
    #[serde(rename = "scholarIds")]
    pub scholars: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct NewsListResponse {
    pub data: Vec<NewsResponse>,
    pub pagination: Pagination,
}

#[derive(Debug, Deserialize)]
pub struct NewsQuery {
    #[serde(flatten)]
    pub pagination: PaginationParams,
    pub scholar_id: Option<String>,
}
