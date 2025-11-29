use chrono::Utc;
use cuid2;

use crate::models::*;
use crate::utils::{AppError, AppResult};

impl super::Database {
    pub async fn list_identities(&self) -> AppResult<Vec<Identity>> {
        let identities =
            sqlx::query_as::<_, Identity>("SELECT * FROM identities ORDER BY display_order, name")
                .fetch_all(&self.pool)
                .await?;

        Ok(identities)
    }

    pub async fn get_identity(&self, id: &str) -> AppResult<Identity> {
        sqlx::query_as::<_, Identity>("SELECT * FROM identities WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Identity with id {} not found", id)))
    }

    pub async fn create_identity(
        &self,
        request: &IdentityRequest,
        created_by: &str,
    ) -> AppResult<Identity> {
        let id = cuid2::create_id();
        let now = Utc::now();

        let identity = sqlx::query_as::<_, Identity>(
            "INSERT INTO identities (id, name, description, display_order, created_by, updated_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5, $6, $6)
         RETURNING *",
        )
        .bind(&id)
        .bind(&request.name)
        .bind(&request.description)
        .bind(request.display_order.unwrap_or(0))
        .bind(created_by)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(identity)
    }

    pub async fn update_identity(
        &self,
        id: &str,
        request: &IdentityRequest,
        updated_by: &str,
    ) -> AppResult<Identity> {
        let now = Utc::now();

        sqlx::query_as::<_, Identity>(
            "UPDATE identities SET name = $1, description = $2, display_order = $3, updated_by = $4, updated_at = $5
         WHERE id = $6
         RETURNING *",
        )
        .bind(&request.name)
        .bind(&request.description)
        .bind(request.display_order.unwrap_or(0))
        .bind(updated_by)
        .bind(now)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Identity with id {} not found", id)))
    }

    pub async fn delete_identity(&self, id: &str) -> AppResult<()> {
        let result = sqlx::query("DELETE FROM identities WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound(format!(
                "Identity with id {} not found",
                id
            )));
        }

        Ok(())
    }
}
