use chrono::Utc;
use cuid2;
use sqlx::QueryBuilder;

use crate::models::*;
use crate::utils::{AppError, AppResult};

impl super::Database {
    fn build_user_filters<'a>(
        builder: &mut QueryBuilder<'a, sqlx::Postgres>,
        params: &'a UserQueryParams,
    ) {
        if let Some(role) = &params.role {
            builder.push(" AND role = ");
            builder.push_bind(role);
        }

        if let Some(active) = params.active {
            builder.push(" AND active = ");
            builder.push_bind(active);
        }
    }

    pub async fn get_user(&self, id: &str) -> AppResult<User> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, oidc_sub, email, name, role, active, last_login, created_at, updated_at
             FROM users
             WHERE id = $1"
        )
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("User with id {} not found", id)))?;

        Ok(user)
    }

    pub async fn get_user_by_oidc_sub(&self, oidc_sub: &str) -> AppResult<Option<User>> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, oidc_sub, email, name, role, active, last_login, created_at, updated_at
             FROM users
             WHERE oidc_sub = $1"
        )
            .bind(oidc_sub)
            .fetch_optional(&self.pool)
            .await?;

        Ok(user)
    }

    pub async fn create_user(
        &self,
        oidc_sub: &str,
        email: &str,
        name: Option<&str>,
        role: UserRole,
    ) -> AppResult<User> {
        let id = cuid2::create_id();
        let now = Utc::now();

        let user = sqlx::query_as::<_, User>(
            "INSERT INTO users (id, oidc_sub, email, name, role, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, false, $6, $6)
         RETURNING *",
        )
        .bind(&id)
        .bind(oidc_sub)
        .bind(email)
        .bind(name)
        .bind(&role)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn update_last_login(&self, user_id: &str) -> AppResult<()> {
        let now = Utc::now();

        sqlx::query("UPDATE users SET last_login = $1 WHERE id = $2")
            .bind(now)
            .bind(user_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn list_users(&self, params: &UserQueryParams) -> AppResult<(Vec<User>, i64)> {
        params
            .pagination
            .validate()
            .map_err(|e| AppError::ValidationError(e))?;

        let mut count_builder = QueryBuilder::new("SELECT COUNT(*) FROM users WHERE 1=1");
        Self::build_user_filters(&mut count_builder, params);

        let total: (i64,) = count_builder.build_query_as().fetch_one(&self.pool).await?;

        if total.0 == 0 {
            return Ok((Vec::new(), 0));
        }

        let mut query_builder = QueryBuilder::new(
            "SELECT id, oidc_sub, email, name, role, active, last_login, created_at, updated_at
             FROM users
             WHERE 1=1"
        );
        Self::build_user_filters(&mut query_builder, params);

        query_builder.push(" ORDER BY created_at DESC LIMIT ");
        query_builder.push_bind(params.pagination.page_size);
        query_builder.push(" OFFSET ");
        query_builder.push_bind((params.pagination.page - 1) * params.pagination.page_size);

        let users: Vec<User> = query_builder.build_query_as().fetch_all(&self.pool).await?;

        Ok((users, total.0))
    }

    pub async fn update_user(&self, user_id: &str, input: &UserUpdateInput) -> AppResult<User> {
        let now = Utc::now();

        let user = sqlx::query_as::<_, User>(
            "UPDATE users
             SET role = COALESCE($1, role),
                 active = COALESCE($2, active),
                 updated_at = $3
             WHERE id = $4
             RETURNING id, oidc_sub, email, name, role, active, last_login, created_at, updated_at"
        )
        .bind(&input.role)
        .bind(input.active)
        .bind(now)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("User with id {} not found", user_id)))?;

        Ok(user)
    }

    pub async fn get_users_info(&self, user_ids: &[String]) -> AppResult<std::collections::HashMap<String, UserInfo>> {
        if user_ids.is_empty() {
            return Ok(std::collections::HashMap::new());
        }

        let users: Vec<UserInfo> = sqlx::query_as(
            "SELECT id, email, name FROM users WHERE id = ANY($1)"
        )
        .bind(user_ids)
        .fetch_all(&self.pool)
        .await?;

        Ok(users.into_iter().map(|u| (u.id.clone(), u)).collect())
    }

    pub async fn delete_user(&self, user_id: &str) -> AppResult<()> {
        let result = sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(user_id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound(format!(
                "User with id {} not found",
                user_id
            )));
        }

        Ok(())
    }
}
