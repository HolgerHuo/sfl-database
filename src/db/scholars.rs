use chrono::Utc;
use cuid2;
use sqlx::{QueryBuilder, Row};
use std::collections::HashMap;

use crate::models::*;
use crate::utils::{AppError, AppResult};

impl super::Database {
    fn build_scholar_filters<'a>(
        builder: &mut QueryBuilder<'a, sqlx::Postgres>,
        query: &'a ScholarQuery,
        public: bool,
    ) {
        // Always filter out deleted scholars
        builder.push(" AND s.deleted = false");

        // For public queries, only show visible scholars
        if public {
            builder.push(" AND s.visible = true");
        }

        if let Some(identities) = &query.identities {
            if !identities.is_empty() {
                builder.push(" AND s.identity = ANY(");
                builder.push_bind(identities);
                builder.push(")");
            }
        }

        if let Some(years) = &query.years_of_birth {
            if !years.is_empty() {
                builder.push(" AND s.year_of_birth = ANY(");
                builder.push_bind(years);
                builder.push(")");
            }
        }

        if let Some(gender) = &query.gender {
            builder.push(" AND s.gender = ");
            builder.push_bind(gender);
        }

        if let Some(featured) = query.featured {
            builder.push(" AND s.featured = ");
            builder.push_bind(featured);
        }

        if let Some(tags) = &query.tags {
            if !tags.is_empty() {
                builder.push(" AND s.id IN (SELECT scholar FROM scholar_tags WHERE tag = ANY(");
                builder.push_bind(tags);
                builder.push("))");
            }
        }

        if let Some(news) = &query.news {
            if !news.is_empty() {
                builder.push(" AND s.id IN (SELECT scholar FROM news_scholars WHERE news = ANY(");
                builder.push_bind(news);
                builder.push("))");
            }
        }
    }

    pub async fn list_scholars(
        &self,
        query: &ScholarQuery,
        public: bool,
    ) -> AppResult<(Vec<ScholarListItemExt>, i64)> {
        query
            .pagination
            .validate()
            .map_err(|e| AppError::ValidationError(e))?;

        let mut count_builder = QueryBuilder::new("SELECT COUNT(*) FROM scholars s WHERE 1=1");
        Self::build_scholar_filters(&mut count_builder, query, public);

        let total: (i64,) = count_builder.build_query_as().fetch_one(&self.pool).await?;

        if total.0 == 0 {
            return Ok((Vec::new(), 0));
        }

        let mut query_builder = QueryBuilder::new(
            "SELECT s.id, s.name, s.gender, s.field_of_research, s.year_of_birth,
                    s.image, s.featured, s.visible, s.deleted, s.identity, s.version,
                    s.created_at, s.updated_at,
                    i.filename as image_filename
             FROM scholars s
             LEFT JOIN images i ON s.image = i.id
             WHERE 1=1",
        );
        Self::build_scholar_filters(&mut query_builder, query, public);

        let sort_column = match query.sort.as_str() {
            "name" => "s.name",
            "created_at" => "s.created_at",
            "year_of_birth" => "s.year_of_birth",
            _ => "s.updated_at",
        };
        let order = if query.order == "asc" { "ASC" } else { "DESC" };
        query_builder.push(format!(" ORDER BY {} {}", sort_column, order));

        query_builder.push(" LIMIT ");
        query_builder.push_bind(query.pagination.page_size);
        query_builder.push(" OFFSET ");
        query_builder.push_bind((query.pagination.page - 1) * query.pagination.page_size);

        let rows = query_builder.build().fetch_all(&self.pool).await?;

        let row_count = rows.len();
        let mut scholars = Vec::with_capacity(row_count);
        let mut scholar_ids = Vec::with_capacity(row_count);
        let mut image_filenames = std::collections::HashMap::with_capacity(row_count);

        for row in rows {
            let scholar_id: String = row.get("id");
            scholar_ids.push(scholar_id.clone());

            let image_filename: Option<String> = row.get("image_filename");
            if let Some(filename) = image_filename {
                image_filenames.insert(scholar_id.clone(), filename);
            }

            scholars.push(ScholarListItem {
                id: scholar_id,
                name: row.get("name"),
                gender: row.get("gender"),
                field_of_research: row.get("field_of_research"),
                year_of_birth: row.get("year_of_birth"),
                image: row.get("image"),
                featured: row.get("featured"),
                visible: row.get("visible"),
                deleted: row.get("deleted"),
                identity: row.get("identity"),
                version: row.get("version"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            });
        }

        let tags = sqlx::query(
            "SELECT st.scholar, t.id, t.name, t.color, t.display_order
             FROM scholar_tags st
             INNER JOIN tags t ON st.tag = t.id
             WHERE st.scholar = ANY($1)
             ORDER BY t.display_order, st.created_at",
        )
        .bind(&scholar_ids)
        .fetch_all(&self.pool)
        .await?;

        let mut tags_map: std::collections::HashMap<String, Vec<TagListItem>> =
            std::collections::HashMap::with_capacity(row_count);
        for tag in tags {
            let scholar_id: String = tag.get("scholar");
            tags_map
                .entry(scholar_id)
                .or_insert_with(Vec::new)
                .push(TagListItem {
                    id: tag.get("id"),
                    name: tag.get("name"),
                    color: tag.get("color"),
                    display_order: tag.get("display_order"),
                });
        }

        let results = scholars
            .into_iter()
            .map(|scholar| {
                let tags = tags_map.remove(&scholar.id).unwrap_or_default();
                let image_filename = image_filenames.remove(&scholar.id);
                ScholarListItemExt {
                    scholar,
                    tags,
                    image_filename,
                }
            })
            .collect();

        Ok((results, total.0))
    }

    pub async fn get_scholar(&self, id: &str) -> AppResult<ScholarResponse> {
        let row = sqlx::query(
            "SELECT s.*,
                    i.id as identity_id, i.name as identity_name, i.description as identity_description,
                    i.display_order as identity_display_order, i.created_by as identity_created_by,
                    i.updated_by as identity_updated_by, i.created_at as identity_created_at,
                    i.updated_at as identity_updated_at, i.archived_at as identity_archived_at,
                    img.filename as image_filename
             FROM scholars s
             INNER JOIN identities i ON s.identity = i.id
             LEFT JOIN images img ON s.image = img.id
             WHERE s.id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Scholar with id {} not found", id)))?;

        self.build_scholar_response(row).await
    }

    pub async fn get_scholar_public(&self, id: &str) -> AppResult<ScholarResponse> {
        let row = sqlx::query(
            "SELECT s.*,
                    i.id as identity_id, i.name as identity_name, i.description as identity_description,
                    i.display_order as identity_display_order, i.created_by as identity_created_by,
                    i.updated_by as identity_updated_by, i.created_at as identity_created_at,
                    i.updated_at as identity_updated_at, i.archived_at as identity_archived_at,
                    img.filename as image_filename
             FROM scholars s
             INNER JOIN identities i ON s.identity = i.id
             LEFT JOIN images img ON s.image = img.id
             WHERE s.id = $1 AND s.visible = true AND s.deleted = false"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Scholar with id {} not found", id)))?;

        self.build_scholar_response(row).await
    }

    async fn build_scholar_response(&self, row: sqlx::postgres::PgRow) -> AppResult<ScholarResponse> {
        use sqlx::Row;

        let scholar = Scholar {
            id: row.get("id"),
            name: row.get("name"),
            gender: row.get("gender"),
            field_of_research: row.get("field_of_research"),
            year_of_birth: row.get("year_of_birth"),
            image: row.get("image"),
            introduction: row.get("introduction"),
            social_influence: row.get("social_influence"),
            featured: row.get("featured"),
            visible: row.get("visible"),
            deleted: row.get("deleted"),
            identity: row.get("identity"),
            version: row.get("version"),
            created_by: row.get("created_by"),
            updated_by: row.get("updated_by"),
            archived_at: row.get("archived_at"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        };

        let identity = Identity {
            id: row.get("identity_id"),
            name: row.get("identity_name"),
            description: row.get("identity_description"),
            display_order: row.get("identity_display_order"),
            created_by: row.get("identity_created_by"),
            updated_by: row.get("identity_updated_by"),
            created_at: row.get("identity_created_at"),
            updated_at: row.get("identity_updated_at"),
            archived_at: row.get("identity_archived_at"),
        };

        let tags = sqlx::query_as::<_, Tag>(
            "SELECT t.* FROM tags t
             INNER JOIN scholar_tags st ON t.id = st.tag
             WHERE st.scholar = $1
             ORDER BY t.display_order",
        )
        .bind(&scholar.id)
        .fetch_all(&self.pool)
        .await?;

        let news = sqlx::query_as::<_, News>(
            "SELECT n.* FROM news n
             INNER JOIN news_scholars ns ON n.id = ns.news
             WHERE ns.scholar = $1
             ORDER BY n.publish_date DESC",
        )
        .bind(&scholar.id)
        .fetch_all(&self.pool)
        .await?;

        let image_filename: Option<String> = row.get("image_filename");

        Ok(ScholarResponse {
            id: scholar.id,
            name: scholar.name,
            gender: scholar.gender,
            field_of_research: scholar.field_of_research,
            year_of_birth: scholar.year_of_birth,
            image: scholar.image,
            image_filename,
            introduction: scholar.introduction,
            social_influence: scholar.social_influence,
            featured: scholar.featured,
            visible: scholar.visible,
            deleted: scholar.deleted,
            version: scholar.version,
            identity,
            tags,
            news,
            archived_at: scholar.archived_at,
            created_at: scholar.created_at,
            updated_at: scholar.updated_at,
        })
    }

    pub async fn get_scholar_tags(&self, scholar_id: &str) -> AppResult<Vec<Tag>> {
        let tags = sqlx::query_as::<_, Tag>(
            "SELECT t.* FROM tags t 
         INNER JOIN scholar_tags st ON t.id = st.tag 
         WHERE st.scholar = $1 
         ORDER BY t.display_order",
        )
        .bind(scholar_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(tags)
    }

    pub async fn get_scholar_news(&self, scholar_id: &str) -> AppResult<Vec<News>> {
        let news = sqlx::query_as::<_, News>(
            "SELECT n.* FROM news n
         INNER JOIN news_scholars ns ON n.id = ns.news
         WHERE ns.scholar = $1
         ORDER BY n.publish_date DESC",
        )
        .bind(scholar_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(news)
    }

    pub async fn create_scholar(
        &self,
        request: &ScholarRequest,
        created_by: &str,
    ) -> AppResult<Scholar> {
        let id = cuid2::create_id();
        let now = Utc::now();

        let mut tx = self.pool.begin().await?;

        let scholar = sqlx::query_as::<_, Scholar>(
            "INSERT INTO scholars (
            id, name, gender, field_of_research, year_of_birth,
            image, introduction, social_influence, identity,
            featured, visible, version, created_by, updated_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, $12, $12, $13, $13)
        RETURNING *",
        )
        .bind(&id)
        .bind(&request.name)
        .bind(&request.gender)
        .bind(&request.field_of_research)
        .bind(request.year_of_birth)
        .bind(&request.image)
        .bind(&request.introduction)
        .bind(&request.social_influence)
        .bind(&request.identity)
        .bind(request.featured)
        .bind(request.visible)
        .bind(created_by)
        .bind(now)
        .fetch_one(&mut *tx)
        .await?;

        if !request.tag_ids.is_empty() {
            sqlx::query(
                "INSERT INTO scholar_tags (scholar, tag, created_at)
                 SELECT $1, unnest($2::char(24)[]), $3",
            )
            .bind(&id)
            .bind(&request.tag_ids)
            .bind(now)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        Ok(scholar)
    }

    pub async fn update_scholar(
        &self,
        scholar_id: &str,
        request: &ScholarRequest,
        user_id: &str,
    ) -> AppResult<Scholar> {
        let now = Utc::now();

        let mut tx = self.pool.begin().await?;

        let current: (i32,) =
            sqlx::query_as("SELECT version FROM scholars WHERE id = $1")
                .bind(scholar_id)
                .fetch_optional(&mut *tx)
                .await?
                .ok_or_else(|| {
                    AppError::NotFound(format!("Scholar with id {} not found", scholar_id))
                })?;

        if current.0 != request.version {
            return Err(AppError::Conflict(format!(
                "Version conflict: expected {}, got {}",
                current.0, request.version
            )));
        }

        let scholar = sqlx::query_as::<_, Scholar>(
            "UPDATE scholars SET
            name = $1, gender = $2, field_of_research = $3, year_of_birth = $4,
            image = $5, introduction = $6, social_influence = $7, identity = $8,
            featured = $9, visible = $10,
            version = version + 1, updated_by = $11, updated_at = $12
         WHERE id = $13
         RETURNING *",
        )
        .bind(&request.name)
        .bind(&request.gender)
        .bind(&request.field_of_research)
        .bind(request.year_of_birth)
        .bind(&request.image)
        .bind(&request.introduction)
        .bind(&request.social_influence)
        .bind(&request.identity)
        .bind(&request.featured)
        .bind(&request.visible)
        .bind(user_id)
        .bind(now)
        .bind(scholar_id)
        .fetch_one(&mut *tx)
        .await?;

        if request.tag_ids.is_empty() {
            sqlx::query("DELETE FROM scholar_tags WHERE scholar = $1")
                .bind(scholar_id)
                .execute(&mut *tx)
                .await?;
        } else {
            sqlx::query(
                "DELETE FROM scholar_tags 
                 WHERE scholar = $1 AND tag <> ALL($2::char(24)[])",
            )
            .bind(scholar_id)
            .bind(&request.tag_ids)
            .execute(&mut *tx)
            .await?;

            sqlx::query(
                "INSERT INTO scholar_tags (scholar, tag, created_at)
                 SELECT $1, unnest($2::char(24)[]), $3
                 ON CONFLICT (scholar, tag) DO NOTHING",
            )
            .bind(scholar_id)
            .bind(&request.tag_ids)
            .bind(now)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        Ok(scholar)
    }

    pub async fn get_scholar_history(
        &self,
        scholar_id: &str,
        page: i64,
        page_size: i64,
    ) -> AppResult<(Vec<History>, i64)> {
        let total: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM scholar_history WHERE scholar = $1")
                .bind(scholar_id)
                .fetch_one(&self.pool)
                .await?;

        let history = sqlx::query_as::<_, History>(
            "SELECT * FROM scholar_history WHERE scholar = $1 
         ORDER BY updated_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(scholar_id)
        .bind(page_size)
        .bind((page - 1) * page_size)
        .fetch_all(&self.pool)
        .await?;

        Ok((history, total.0))
    }

    pub async fn get_scholars_info(&self, scholar_ids: &[String]) -> AppResult<HashMap<String, ScholarInfo>> {
        if scholar_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let scholars: Vec<ScholarInfo> = sqlx::query_as(
            "SELECT s.id, s.name, i.filename as image_filename
             FROM scholars s
             LEFT JOIN images i ON s.image = i.id
             WHERE s.id = ANY($1) AND s.visible = true AND s.deleted = false"
        )
        .bind(scholar_ids)
        .fetch_all(&self.pool)
        .await?;

        Ok(scholars.into_iter().map(|s| (s.id.clone(), s)).collect())
    }

    pub async fn delete_scholar(&self, scholar_id: &str) -> AppResult<()> {
        let result = sqlx::query("UPDATE scholars SET deleted = true WHERE id = $1")
            .bind(scholar_id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound(format!(
                "Scholar with id {} not found",
                scholar_id
            )));
        }

        Ok(())
    }
}
