use chrono::Utc;
use cuid2;

use crate::models::*;
use crate::utils::{AppError, AppResult};

impl super::Database {
    pub async fn list_tags(&self) -> AppResult<Vec<Tag>> {
        let tags = sqlx::query_as::<_, Tag>("SELECT * FROM tags ORDER BY display_order, name")
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
            "INSERT INTO tags (id, name, description, color, display_order, created_by, updated_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $7)
         RETURNING *",
        )
        .bind(&id)
        .bind(&request.name)
        .bind(&request.description)
        .bind(&request.color)
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
            "UPDATE tags SET name = $1, description = $2, color = $3, display_order = $4, updated_by = $5, updated_at = $6
         WHERE id = $7
         RETURNING *"
        )
        .bind(&request.name)
        .bind(&request.description)
        .bind(&request.color)
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
}
