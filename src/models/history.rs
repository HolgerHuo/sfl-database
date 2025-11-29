use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use super::Pagination;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct History {
    pub id: String,
    #[serde(rename = "scholar")]
    pub scholar: String,
    pub version: i32,
    pub values: serde_json::Value,
    #[serde(rename = "updatedBy")]
    pub updated_by: Option<String>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct HistoryListResponse {
    pub data: Vec<History>,
    pub pagination: Pagination,
}
