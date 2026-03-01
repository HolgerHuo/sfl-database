use chrono::Utc;
use cuid2;
use std::collections::HashMap;

use crate::models::*;
use crate::utils::{AppError, AppResult};

impl super::Database {
    pub async fn list_tags(&self, featured: Option<bool>) -> AppResult<Vec<Tag>> {
        let tags = sqlx::query_as::<_, Tag>(
            "SELECT * FROM tags WHERE ($1::bool IS NULL OR featured = $1) ORDER BY display_order, name",
        )
            .bind(featured)
            .fetch_all(&self.pool)
            .await?;

        Ok(tags)
    }

    pub async fn get_tag(&self, id: &str) -> AppResult<Tag> {
        sqlx::query_as::<_, Tag>("SELECT * FROM tags WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Tag with id {} not found", id)))
    }

    pub async fn create_tag(&self, request: &TagRequest, created_by: &str) -> AppResult<Tag> {
        let id = cuid2::create_id();
        let now = Utc::now();

        let tag = sqlx::query_as::<_, Tag>(
                "INSERT INTO tags (id, name, description, color, featured, display_order, created_by, updated_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $8)
         RETURNING *",
        )
        .bind(&id)
        .bind(&request.name)
        .bind(&request.description)
        .bind(&request.color)
          .bind(request.featured.unwrap_or(false))
        .bind(request.display_order.unwrap_or(0))
        .bind(created_by)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(tag)
    }

    pub async fn update_tag(
        &self,
        id: &str,
        request: &TagRequest,
        updated_by: &str,
    ) -> AppResult<Tag> {
        let now = Utc::now();

        sqlx::query_as::<_, Tag>(
                "UPDATE tags SET name = $1, description = $2, color = $3, featured = COALESCE($4, featured), display_order = $5, updated_by = $6, updated_at = $7
            WHERE id = $8
         RETURNING *"
        )
        .bind(&request.name)
        .bind(&request.description)
        .bind(&request.color)
          .bind(request.featured)
        .bind(request.display_order.unwrap_or(0))
        .bind(updated_by)
        .bind(now)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Tag with id {} not found", id)))
    }

    pub async fn delete_tag(&self, id: &str) -> AppResult<()> {
        let result = sqlx::query("DELETE FROM tags WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound(format!("Tag with id {} not found", id)));
        }

        Ok(())
    }

    pub async fn get_tag_scholars(
        &self,
        tag_id: &str,
        page: Option<i64>,
        page_size: Option<i64>,
    ) -> AppResult<(Vec<String>, i64)> {
        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM scholar_tags WHERE tag = $1"
        )
        .bind(tag_id)
        .fetch_one(&self.pool)
        .await?;

        // Get scholar IDs with optional pagination
        let scholars: Vec<(String,)> = if let (Some(page), Some(page_size)) = (page, page_size) {
            let offset = (page - 1) * page_size;
            sqlx::query_as(
                "SELECT scholar FROM scholar_tags WHERE tag = $1 ORDER BY created_at LIMIT $2 OFFSET $3"
            )
            .bind(tag_id)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as("SELECT scholar FROM scholar_tags WHERE tag = $1 ORDER BY created_at")
                .bind(tag_id)
                .fetch_all(&self.pool)
                .await?
        };

        Ok((scholars.into_iter().map(|(id,)| id).collect(), total.0))
    }

    pub async fn get_tags_scholars_map(&self, tag_ids: &[String]) -> AppResult<HashMap<String, Vec<String>>> {
        if tag_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let rows: Vec<(String, String)> = sqlx::query_as(
            "SELECT tag, scholar FROM scholar_tags WHERE tag = ANY($1) ORDER BY created_at"
        )
        .bind(tag_ids)
        .fetch_all(&self.pool)
        .await?;

        let mut map: HashMap<String, Vec<String>> = HashMap::new();
        for (tag_id, scholar_id) in rows {
            map.entry(tag_id).or_insert_with(Vec::new).push(scholar_id);
        }

        Ok(map)
    }
}
