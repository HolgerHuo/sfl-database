use chrono::Utc;
use cuid2;

use crate::models::*;
use crate::utils::{AppError, AppResult};

impl super::Database {
    pub async fn get_image(&self, id: &str) -> AppResult<Image> {
        sqlx::query_as::<_, Image>("SELECT * FROM images WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Image with id {} not found", id)))
    }

    pub async fn create_image(
        &self,
        request: &ImageRequest,
        uploaded_by: &str,
    ) -> AppResult<Image> {
        let id = cuid2::create_id();
        let now = Utc::now();

        let image = sqlx::query_as::<_, Image>(
            "INSERT INTO images (id, filename, mime_type, size_bytes, uploaded_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $6)
            RETURNING *"
        )
        .bind(&id)
        .bind(&request.filename)
        .bind(&request.mime_type)
        .bind(request.size_bytes)
        .bind(uploaded_by)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(image)
    }

    pub async fn delete_image(&self, id: &str) -> AppResult<()> {
        let result = sqlx::query("DELETE FROM images WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound(format!(
                "Image with id {} not found",
                id
            )));
        }

        Ok(())
    }
}
