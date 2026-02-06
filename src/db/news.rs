use crate::models::*;
use crate::utils::{AppError, AppResult};
use chrono::Utc;
use cuid2;

impl super::Database {
    pub async fn list_news(&self, query: &NewsQuery) -> AppResult<(Vec<News>, i64)> {
        query
            .pagination
            .validate()
            .map_err(|e| AppError::ValidationError(e))?;

        let offset = (query.pagination.page - 1) * query.pagination.page_size;

        let (news, total) = if let Some(scholar_id) = &query.scholar_id {
            let news = sqlx::query_as::<_, News>(
                "SELECT DISTINCT n.* FROM news n
                 INNER JOIN news_scholars ns ON n.id = ns.news
                 WHERE ns.scholar = $1
                 ORDER BY n.publish_date DESC
                 LIMIT $2 OFFSET $3",
            )
            .bind(scholar_id)
            .bind(query.pagination.page_size)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

            let total: (i64,) = sqlx::query_as(
                "SELECT COUNT(DISTINCT n.id) FROM news n
                 INNER JOIN news_scholars ns ON n.id = ns.news
                 WHERE ns.scholar = $1",
            )
            .bind(scholar_id)
            .fetch_one(&self.pool)
            .await?;

            (news, total.0)
        } else {
            let news = sqlx::query_as::<_, News>(
                "SELECT * FROM news
                 ORDER BY publish_date DESC
                 LIMIT $1 OFFSET $2",
            )
            .bind(query.pagination.page_size)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

            let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM news")
                .fetch_one(&self.pool)
                .await?;

            (news, total.0)
        };

        Ok((news, total))
    }

    pub async fn get_news(&self, id: &str) -> AppResult<News> {
        sqlx::query_as::<_, News>("SELECT * FROM news WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("News with id {} not found", id)))
    }

    pub async fn get_news_scholars(&self, news: &str) -> AppResult<Vec<String>> {
        let scholars: Vec<(String,)> =
            sqlx::query_as("SELECT scholar FROM news_scholars WHERE news = $1 ORDER BY created_at")
                .bind(news)
                .fetch_all(&self.pool)
                .await?;

        Ok(scholars.into_iter().map(|(id,)| id).collect())
    }

    pub async fn get_news_scholars_batch(&self, news_ids: &[String]) -> AppResult<Vec<(String, String)>> {
        if news_ids.is_empty() {
            return Ok(Vec::new());
        }

        let results: Vec<(String, String)> = sqlx::query_as(
            "SELECT news, scholar FROM news_scholars WHERE news = ANY($1) ORDER BY news, created_at"
        )
        .bind(news_ids)
        .fetch_all(&self.pool)
        .await?;

        Ok(results)
    }

    pub async fn create_news(&self, request: &NewsRequest, created_by: &str) -> AppResult<News> {
        let id = cuid2::create_id();
        let now = Utc::now();

        let mut tx = self.pool.begin().await?;

        let news = sqlx::query_as::<_, News>(
            "INSERT INTO news (id, title, source, url, publish_date, created_by, updated_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $7)
            RETURNING *"
        )
        .bind(&id)
        .bind(&request.title)
        .bind(&request.source)
        .bind(&request.url)
        .bind(request.publish_date)
        .bind(created_by)
        .bind(now)
        .fetch_one(&mut *tx)
        .await?;

        if !request.scholars.is_empty() {
            sqlx::query(
                "INSERT INTO news_scholars (news, scholar, created_at)
                 SELECT $1, unnest($2::char(24)[]), $3",
            )
            .bind(&id)
            .bind(&request.scholars)
            .bind(now)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        Ok(news)
    }

    pub async fn update_news(
        &self,
        news_id: &str,
        request: &NewsRequest,
        user_id: &str,
    ) -> AppResult<News> {
        let now = Utc::now();

        let mut tx = self.pool.begin().await?;

        let updated_news = sqlx::query_as::<_, News>(
            "UPDATE news SET title = $1, source = $2, url = $3, publish_date = $4, 
            updated_by = $5, updated_at = $6
            WHERE id = $7
            RETURNING *",
        )
        .bind(&request.title)
        .bind(&request.source)
        .bind(&request.url)
        .bind(request.publish_date)
        .bind(user_id)
        .bind(now)
        .bind(news_id)
        .fetch_one(&mut *tx)
        .await?;

        if request.scholars.is_empty() {
            sqlx::query("DELETE FROM news_scholars WHERE news = $1")
                .bind(news_id)
                .execute(&mut *tx)
                .await?;
        } else {
            sqlx::query(
                "DELETE FROM news_scholars 
                 WHERE news = $1 AND scholar <> ALL($2::char(24)[])",
            )
            .bind(news_id)
            .bind(&request.scholars)
            .execute(&mut *tx)
            .await?;

            sqlx::query(
                "INSERT INTO news_scholars (news, scholar, created_at)
                 SELECT $1, unnest($2::char(24)[]), $3
                 ON CONFLICT (news, scholar) DO NOTHING",
            )
            .bind(news_id)
            .bind(&request.scholars)
            .bind(now)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        Ok(updated_news)
    }

    pub async fn delete_news(&self, news_id: &str) -> AppResult<()> {
        let result = sqlx::query("DELETE FROM news WHERE id = $1")
            .bind(news_id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound(format!(
                "News with id {} not found",
                news_id
            )));
        }
        Ok(())
    }
}
