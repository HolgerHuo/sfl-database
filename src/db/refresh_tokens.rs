// placeholder, not used

use chrono::{Duration, Utc};
use sha2::{Digest, Sha256};

use crate::constants::{MAX_REFRESH_TOKENS_PER_USER, REFRESH_TOKEN_EXPIRY_SECS};
use crate::models::RefreshToken;
use crate::utils::AppResult;

pub fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    format!("{:x}", hasher.finalize())
}

impl super::Database {
    pub async fn create_refresh_token(
        &self,
        user_id: &str,
        token: &str,
    ) -> AppResult<RefreshToken> {
        let id = cuid2::create_id();
        let token_hash = hash_token(token);
        let now = Utc::now();
        let expires_at = now + Duration::seconds(REFRESH_TOKEN_EXPIRY_SECS);

        let _ = &self.cleanup_old_tokens(user_id).await?;

        let refresh_token = sqlx::query_as::<_, RefreshToken>(
            "INSERT INTO refresh_tokens (id, account, token_hash, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *",
        )
        .bind(&id)
        .bind(user_id)
        .bind(&token_hash)
        .bind(expires_at)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(refresh_token)
    }

    pub async fn get_refresh_token_by_hash(
        &self,
        token_hash: &str,
    ) -> AppResult<Option<RefreshToken>> {
        let token = sqlx::query_as::<_, RefreshToken>(
            "SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()",
        )
        .bind(token_hash)
        .fetch_optional(&self.pool)
        .await?;

        Ok(token)
    }

    pub async fn update_last_used(&self, token_id: &str) -> AppResult<()> {
        let now = Utc::now();

        sqlx::query("UPDATE refresh_tokens SET last_used_at = $1 WHERE id = $2")
            .bind(now)
            .bind(token_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn revoke_all_user_tokens(&self, user_id: &str) -> AppResult<()> {
        sqlx::query("DELETE FROM refresh_tokens WHERE account = $1")
            .bind(user_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn cleanup_old_tokens(&self, user_id: &str) -> AppResult<()> {
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM refresh_tokens WHERE account = $1 AND expires_at > NOW()",
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        if count.0 >= MAX_REFRESH_TOKENS_PER_USER as i64 {
            let tokens_to_delete = count.0 - MAX_REFRESH_TOKENS_PER_USER as i64 + 1;

            sqlx::query(
                "DELETE FROM refresh_tokens
             WHERE id IN (
                 SELECT id FROM refresh_tokens
                 WHERE account = $1 AND expires_at > NOW()
                 ORDER BY created_at ASC
                 LIMIT $2
             )",
            )
            .bind(user_id)
            .bind(tokens_to_delete)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    pub async fn cleanup_expired_tokens(&self) -> AppResult<u64> {
        let result = sqlx::query("DELETE FROM refresh_tokens WHERE expires_at < NOW()")
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected())
    }
}
