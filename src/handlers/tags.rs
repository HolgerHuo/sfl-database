use actix_web::{HttpRequest, HttpResponse, web};

use crate::middleware::{extract_claims, require_admin, validate_input};
use crate::models::*;
use crate::utils::{AppResult, AppState};

pub async fn get_tag(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    query: web::Query<PaginationParams>,
) -> AppResult<HttpResponse> {
    query
        .validate()
        .map_err(|e| crate::utils::AppError::ValidationError(e))?;

    let tag_id = path.into_inner();
    let tag = app_state.db.get_tag(&tag_id).await?;
    let (scholar_ids, total) = app_state.db.get_tag_scholars(&tag_id, Some(query.page), Some(query.page_size)).await?;
    let scholars_map = app_state.db.get_scholars_info(&scholar_ids).await?;

    let scholars: Vec<ScholarInfo> = scholar_ids
        .iter()
        .filter_map(|id| scholars_map.get(id).cloned())
        .collect();
    
    let pagination = Pagination::new(query.page, query.page_size, total);
    
    Ok(HttpResponse::Ok().json(TagDetailResponse { tag, scholars, pagination }))
}

pub async fn list_tags(
    app_state: web::Data<AppState>,
    query: web::Query<TagListParams>,
) -> AppResult<HttpResponse> {
    let tags = app_state.db.list_tags(query.featured).await?;
    
    let tag_ids: Vec<String> = tags.iter().map(|t| t.id.clone()).collect();
    let tags_scholars_map = app_state.db.get_tags_scholars_map(&tag_ids).await?;
    
    let mut all_scholar_ids = Vec::new();
    for scholar_ids in tags_scholars_map.values() {
        all_scholar_ids.extend(scholar_ids.clone());
    }
    all_scholar_ids.sort();
    all_scholar_ids.dedup();

    let scholars_info_map = app_state.db.get_scholars_info(&all_scholar_ids).await?;

    let responses: Vec<TagResponse> = tags
        .into_iter()
        .map(|tag| {
            let scholar_ids = tags_scholars_map.get(&tag.id).cloned().unwrap_or_default();
            let scholars: Vec<ScholarInfo> = scholar_ids
                .iter()
                .filter_map(|id| scholars_info_map.get(id).cloned())
                .collect();
            
            TagResponse { tag, scholars }
        })
        .collect();
    
    Ok(HttpResponse::Ok().json(TagListResponse { data: responses }))
}

pub async fn create_tag(
    app_state: web::Data<AppState>,
    input: web::Json<TagRequest>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    require_admin(&claims)?;
    validate_input(&*input)?;

    // Strip # from color if present
    let mut tag_request = input.into_inner();
    if let Some(ref color) = tag_request.color {
        tag_request.color = Some(color.trim_start_matches('#').to_string());
    }

    let tag = app_state.db.create_tag(&tag_request, &claims.user_id).await?;
    let (scholar_ids, _) = app_state.db.get_tag_scholars(&tag.id, None, None).await?;
    let scholars_map = app_state.db.get_scholars_info(&scholar_ids).await?;

    let scholars: Vec<ScholarInfo> = scholar_ids
        .iter()
        .filter_map(|id| scholars_map.get(id).cloned())
        .collect();

    app_state.cache.invalidate_pattern("/api/tags").await;
    app_state.cache.invalidate_pattern("/api/scholars").await;

    Ok(HttpResponse::Created().json(TagResponse { tag, scholars }))
}

pub async fn update_tag(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    input: web::Json<TagRequest>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    require_admin(&claims)?;
    validate_input(&*input)?;

    // Strip # from color if present
    let mut tag_request = input.into_inner();
    if let Some(ref color) = tag_request.color {
        tag_request.color = Some(color.trim_start_matches('#').to_string());
    }

    let tag_id = path.into_inner();
    let tag = app_state
        .db
        .update_tag(&tag_id, &tag_request, &claims.user_id)
        .await?;
    let (scholar_ids, _) = app_state.db.get_tag_scholars(&tag.id, None, None).await?;
    let scholars_map = app_state.db.get_scholars_info(&scholar_ids).await?;

    let scholars: Vec<ScholarInfo> = scholar_ids
        .iter()
        .filter_map(|id| scholars_map.get(id).cloned())
        .collect();

    app_state.cache.invalidate_pattern("/api/tags").await;
    app_state.cache.invalidate_pattern("/api/scholars").await;

    Ok(HttpResponse::Ok().json(TagResponse { tag, scholars }))
}

pub async fn delete_tag(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    require_admin(&claims)?;

    let tag_id = path.into_inner();
    app_state.db.delete_tag(&tag_id).await?;

    app_state.cache.invalidate_pattern("/api/tags").await;
    app_state.cache.invalidate_pattern("/api/scholars").await;

    Ok(HttpResponse::NoContent().finish())
}
