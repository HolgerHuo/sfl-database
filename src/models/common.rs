use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "gender")]
pub enum Gender {
    M,
    F,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Pagination {
    pub page: i64,
    #[serde(rename = "pageSize")]
    pub page_size: i64,
    pub total: i64,
    #[serde(rename = "totalPages")]
    pub total_pages: i64,
}

impl Pagination {
    pub fn new(page: i64, page_size: i64, total: i64) -> Self {
        let total_pages = (total as f64 / page_size as f64).ceil() as i64;
        Self {
            page,
            page_size,
            total,
            total_pages,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct PaginationParams {
    #[serde(
        default = "default_page",
        deserialize_with = "deserialize_number_from_string"
    )]
    pub page: i64,
    #[serde(
        default = "default_page_size",
        deserialize_with = "deserialize_number_from_string"
    )]
    pub page_size: i64,
}

fn deserialize_number_from_string<'de, D>(deserializer: D) -> Result<i64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::{self, Deserialize};

    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrInt {
        String(String),
        Int(i64),
    }

    match StringOrInt::deserialize(deserializer)? {
        StringOrInt::String(s) => s.parse::<i64>().map_err(de::Error::custom),
        StringOrInt::Int(i) => Ok(i),
    }
}

fn default_page() -> i64 {
    1
}

fn default_page_size() -> i64 {
    20
}

impl PaginationParams {
    pub fn validate(&self) -> Result<(), String> {
        if self.page < 1 {
            return Err("Page must be at least 1".to_string());
        }
        if self.page_size < 1 || self.page_size > 100 {
            return Err("Page size must be between 1 and 100".to_string());
        }
        Ok(())
    }
}
