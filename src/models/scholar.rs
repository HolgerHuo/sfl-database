use chrono::{DateTime, Utc};
use serde::{Deserialize, Deserializer, Serialize};
use sqlx::FromRow;
use validator::Validate;

use super::{Gender, Identity, News, Tag, TagListItem};

fn deserialize_string_vec<'de, D>(deserializer: D) -> Result<Option<Vec<String>>, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrVec {
        String(String),
        Vec(Vec<String>),
    }

    let value = Option::<StringOrVec>::deserialize(deserializer)?;

    Ok(value.map(|v| match v {
        StringOrVec::String(s) => s
            .split(',')
            .map(|item| item.trim().to_string())
            .filter(|item| !item.is_empty())
            .collect(),
        StringOrVec::Vec(vec) => vec,
    }))
}

fn deserialize_i32_vec<'de, D>(deserializer: D) -> Result<Option<Vec<i32>>, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrVec {
        String(String),
        Int(i32),
        Vec(Vec<i32>),
    }

    let value = Option::<StringOrVec>::deserialize(deserializer)?;

    Ok(value.map(|v| match v {
        StringOrVec::String(s) => s
            .split(',')
            .filter_map(|item| item.trim().parse::<i32>().ok())
            .collect(),
        StringOrVec::Int(i) => vec![i],
        StringOrVec::Vec(vec) => vec,
    }))
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Scholar {
    pub id: String,
    pub name: String,
    pub gender: Gender,
    #[serde(rename = "fieldOfResearch")]
    pub field_of_research: String,
    #[serde(rename = "yearOfBirth")]
    pub year_of_birth: i32,
    pub image: Option<String>,
    pub introduction: String,
    #[serde(rename = "socialInfluence")]
    pub social_influence: String,
    pub featured: bool,
    pub identity: String,
    pub visible: bool,
    pub deleted: bool,
    pub version: i32,
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
pub struct ScholarResponse {
    pub id: String,
    pub name: String,
    pub gender: Gender,
    #[serde(rename = "fieldOfResearch")]
    pub field_of_research: String,
    #[serde(rename = "yearOfBirth")]
    pub year_of_birth: i32,
    pub image: Option<String>,
    #[serde(rename = "imageFilename", skip_serializing_if = "Option::is_none")]
    pub image_filename: Option<String>,
    pub introduction: String,
    #[serde(rename = "socialInfluence")]
    pub social_influence: String,
    pub featured: bool,
    pub visible: bool,
    pub deleted: bool,
    pub version: i32,
    pub identity: Identity,
    pub tags: Vec<Tag>,
    pub news: Vec<News>,
    #[serde(rename = "archivedAt")]
    pub archived_at: Option<DateTime<Utc>>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ScholarRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
    pub gender: Gender,
    #[serde(rename = "fieldOfResearch")]
    #[validate(length(min = 1, max = 500))]
    pub field_of_research: String,
    #[serde(rename = "yearOfBirth")]
    #[validate(range(min = 1900))]
    pub year_of_birth: i32,
    pub image: Option<String>,
    #[validate(length(min = 1))]
    pub introduction: String,
    #[serde(rename = "socialInfluence")]
    #[validate(length(min = 1))]
    pub social_influence: String,
    pub identity: String,
    pub featured: bool,
    pub visible: bool,
    #[serde(rename = "tagIds", default)]
    pub tag_ids: Vec<String>,
    pub version: i32,
}

#[derive(Debug, Deserialize)]
pub struct ScholarQuery {
    #[serde(flatten)]
    pub pagination: super::PaginationParams,
    #[serde(deserialize_with = "deserialize_string_vec", default)]
    pub tags: Option<Vec<String>>,
    #[serde(deserialize_with = "deserialize_string_vec", default)]
    pub identities: Option<Vec<String>>,
    #[serde(
        rename = "yearsOfBirth",
        deserialize_with = "deserialize_i32_vec",
        default
    )]
    pub years_of_birth: Option<Vec<i32>>,
    pub gender: Option<Gender>,
    #[serde(deserialize_with = "deserialize_string_vec", default)]
    pub news: Option<Vec<String>>,
    pub featured: Option<bool>,
    #[serde(default = "default_sort")]
    pub sort: String,
    #[serde(default = "default_order")]
    pub order: String,
}

fn default_sort() -> String {
    "published_at".to_string()
}

fn default_order() -> String {
    "desc".to_string()
}

#[derive(Debug, Serialize)]
pub struct ScholarListItem {
    pub id: String,
    pub name: String,
    pub gender: Gender,
    #[serde(rename = "fieldOfResearch")]
    pub field_of_research: String,
    #[serde(rename = "yearOfBirth")]
    pub year_of_birth: i32,
    pub image: Option<String>,
    pub featured: bool,
    pub visible: bool,
    pub deleted: bool,
    pub identity: String,
    pub version: i32,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ScholarListItemExt {
    #[serde(flatten)]
    pub scholar: ScholarListItem,
    pub tags: Vec<TagListItem>,
    #[serde(rename = "imageFilename", skip_serializing_if = "Option::is_none")]
    pub image_filename: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ScholarListItemExtResponse {
    pub data: Vec<ScholarListItemExt>,
    pub pagination: super::Pagination,
}
