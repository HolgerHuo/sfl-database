use sqlx::{Row, QueryBuilder};
use crate::models::*;
use crate::utils::AppResult;

impl super::Database {
    /// Search for scholars with filtering support
    /// Supports filtering by identity, tags, and visibility
    pub async fn search_scholars_by_embedding_filtered(
        &self,
        embedding: &[f32],
        limit: i64,
        similarity_threshold: f32,
        include_hidden: bool,
        identities: Option<&[String]>,
        tags: Option<&[String]>,
    ) -> AppResult<Vec<RAGScholarResult>> {
        // Convert embedding to string format for SQL
        let embedding_str = format!("[{}]", 
            embedding.iter()
                .map(|v| v.to_string())
                .collect::<Vec<_>>()
                .join(",")
        );

        let mut query_builder = QueryBuilder::new(
            "SELECT 
                s.id,
                s.name,
                s.field_of_research,
                s.introduction,
                s.social_influence,
                (1 - (se.embedding <=> "
        );
        query_builder.push_bind(embedding_str.clone());
        query_builder.push(
            "::vector)) as similarity_score
            FROM scholars s
            LEFT JOIN scholar_embeddings se ON s.id = se.scholar_id
            WHERE s.deleted = false"
        );

        // Visibility filter
        if !include_hidden {
            query_builder.push(" AND s.visible = true");
        }

        query_builder.push(" AND se.embedding IS NOT NULL");

        // Similarity threshold
        query_builder.push(" AND (1 - (se.embedding <=> ");
        query_builder.push_bind(embedding_str);
        query_builder.push("::vector)) > ");
        query_builder.push_bind(similarity_threshold as f64);

        // Identity filter
        if let Some(identity_list) = identities {
            if !identity_list.is_empty() {
                query_builder.push(" AND s.identity = ANY(");
                query_builder.push_bind(identity_list);
                query_builder.push(")");
            }
        }

        // Tag filter
        if let Some(tag_list) = tags {
            if !tag_list.is_empty() {
                query_builder.push(
                    " AND EXISTS (
                        SELECT 1
                        FROM scholar_tags st
                        INNER JOIN tags t ON t.id = st.tag
                        WHERE st.scholar = s.id
                        AND t.name = ANY("
                );
                query_builder.push_bind(tag_list);
                query_builder.push("))");
            }
        }

        query_builder.push(" ORDER BY similarity_score DESC");
        query_builder.push(" LIMIT ");
        query_builder.push_bind(limit);

        let query = query_builder.build();
        let rows = query.fetch_all(&self.pool).await?;

        let results = rows.iter().map(|row| {
            let similarity_score: f64 = row.get("similarity_score");
            RAGScholarResult {
                id: row.get("id"),
                name: row.get("name"),
                field_of_research: row.get("field_of_research"),
                introduction: row.get("introduction"),
                social_influence: row.get("social_influence"),
                similarity_score: similarity_score as f32,
            }
        }).collect();

        Ok(results)

    }

    /// Store scholar embedding in the database
    pub async fn store_scholar_embedding(
        &self,
        scholar_id: &str,
        embedding_text: &str,
        embedding: &[f32],
    ) -> AppResult<()> {
        let id = cuid2::cuid();
        let embedding_str = format!("[{}]", 
            embedding.iter()
                .map(|v| v.to_string())
                .collect::<Vec<_>>()
                .join(",")
        );

        sqlx::query(
            "INSERT INTO scholar_embeddings (id, scholar_id, embedding_text, embedding, embedded_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4::vector, NOW(), NOW(), NOW())
            ON CONFLICT (scholar_id) DO UPDATE SET
                embedding_text = $3,
                embedding = $4::vector,
                embedded_at = NOW(),
                updated_at = NOW()"
        )
        .bind(&id)
        .bind(scholar_id)
        .bind(embedding_text)
        .bind(embedding_str)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get all visible scholars without embeddings (for batch processing)
    pub async fn get_scholars_without_embeddings(&self) -> AppResult<Vec<Scholar>> {
        let scholars = sqlx::query_as::<_, Scholar>(
            "SELECT s.* FROM scholars s
            LEFT JOIN scholar_embeddings se ON s.id = se.scholar_id
            WHERE s.deleted = false 
              AND s.visible = true
              AND (se.embedding IS NULL OR se.embedding_text IS NULL)
            ORDER BY s.created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(scholars)
    }

    /// Build text for embedding from scholar data (works for all scholars, including hidden)
    pub async fn build_scholar_embedding_text(&self, scholar_id: &str) -> AppResult<String> {
        // Get basic scholar info (doesn't require visibility)
        let scholar: Scholar = sqlx::query_as(
            "SELECT * FROM scholars WHERE id = $1"
        )
        .bind(scholar_id)
        .fetch_one(&self.pool)
        .await?;

        // Get identity
        let identity: Option<(String,)> = sqlx::query_as(
            "SELECT name FROM identities WHERE id = $1"
        )
        .bind(&scholar.identity)
        .fetch_optional(&self.pool)
        .await?;

        let identity_name = identity.map(|(n,)| n).unwrap_or_else(|| "Unknown".to_string());

        // Get tags
        let tags: Vec<(String,)> = sqlx::query_as(
            "SELECT t.name FROM tags t
            INNER JOIN scholar_tags st ON t.id = st.tag
            WHERE st.scholar = $1"
        )
        .bind(scholar_id)
        .fetch_all(&self.pool)
        .await?;

        // Get news
        let news: Vec<(String,)> = sqlx::query_as(
            "SELECT n.title FROM news n
            INNER JOIN news_scholars ns ON n.id = ns.news
            WHERE ns.scholar = $1"
        )
        .bind(scholar_id)
        .fetch_all(&self.pool)
        .await?;

        // Combine all relevant text fields
        let text = format!(
            "Scholar: {} ({}). Field of Research: {}. Born: {}. Introduction: {}. Social Influence: {}. Identity: {}. Tags: {}. News: {}",
            scholar.name,
            scholar.id,
            scholar.field_of_research,
            scholar.year_of_birth,
            scholar.introduction,
            scholar.social_influence,
            identity_name,
            tags.iter()
                .map(|(n,)| n.clone())
                .collect::<Vec<_>>()
                .join(", "),
            news.iter()
                .map(|(n,)| n.clone())
                .collect::<Vec<_>>()
                .join(", ")
        );

        Ok(text)
    }

    /// Get all visible scholars (for reindexing)
    pub async fn get_all_visible_scholars(&self) -> AppResult<Vec<Scholar>> {
        let scholars = sqlx::query_as::<_, Scholar>(
            "SELECT s.* FROM scholars s
            WHERE s.deleted = false 
              AND s.visible = true
            ORDER BY s.created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(scholars)
    }
}
