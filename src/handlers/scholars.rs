use actix_web::{HttpRequest, HttpResponse, web};

use crate::middleware::{extract_claims, require_admin, validate_input};
use crate::models::*;
use crate::utils::{AppError, AppResult, AppState};

pub async fn list_scholars(
    app_state: web::Data<AppState>,
    query: web::Query<ScholarQuery>,
) -> AppResult<HttpResponse> {
    let (scholars_simplified, total) = app_state.db.list_scholars(&query, true).await?;

    let pagination = Pagination::new(query.pagination.page, query.pagination.page_size, total);

    Ok(HttpResponse::Ok().json(ScholarListItemExtResponse {
        data: scholars_simplified,
        pagination,
    }))
}

pub async fn get_scholar(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    _req: HttpRequest,
) -> AppResult<HttpResponse> {
    let scholar_id = path.into_inner();
    let scholar_response = app_state.db.get_scholar_public(&scholar_id).await?;

    Ok(HttpResponse::Ok().json(scholar_response))
}

pub async fn get_scholar_admin(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let _claims = extract_claims(&req)?;
    let scholar_id = path.into_inner();
    let scholar_response = app_state.db.get_scholar(&scholar_id).await?;

    Ok(HttpResponse::Ok().json(scholar_response))
}

pub async fn list_all_scholars(
    app_state: web::Data<AppState>,
    query: web::Query<ScholarQuery>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let _claims = extract_claims(&req)?;

    let (scholars_simplified, total) = app_state.db.list_scholars(&query, false).await?;

    let pagination = Pagination::new(query.pagination.page, query.pagination.page_size, total);

    Ok(HttpResponse::Ok().json(ScholarListItemExtResponse {
        data: scholars_simplified,
        pagination,
    }))
}

pub async fn create_scholar(
    app_state: web::Data<AppState>,
    input: web::Json<ScholarRequest>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    validate_input(&*input)?;

    let scholar = app_state.db.create_scholar(&input, &claims.user_id).await?;
    let scholar_response = app_state.db.get_scholar(&scholar.id).await?;

    app_state.cache.invalidate_pattern("/api/scholars").await;
    app_state.cache.invalidate_pattern("/api/tags").await;

    Ok(HttpResponse::Created().json(scholar_response))
}

pub async fn update_scholar(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    input: web::Json<ScholarRequest>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    let scholar_id = path.into_inner();
    validate_input(&*input)?;

    let scholar = app_state
        .db
        .update_scholar(&scholar_id, &input, &claims.user_id)
        .await?;
    let scholar_response = app_state.db.get_scholar(&scholar.id).await?;

    app_state.cache.invalidate_pattern("/api/scholars").await;
    app_state.cache.invalidate_pattern("/api/tags").await;

    Ok(HttpResponse::Ok().json(scholar_response))
}

pub async fn get_scholar_history(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    query: web::Query<PaginationParams>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let _claims = extract_claims(&req)?;
    let scholar_id = path.into_inner();

    query.validate().map_err(|e| AppError::ValidationError(e))?;

    let (history, total) = app_state
        .db
        .get_scholar_history(&scholar_id, query.page, query.page_size)
        .await?;

    let pagination = Pagination::new(query.page, query.page_size, total);

    Ok(HttpResponse::Ok().json(HistoryListResponse {
        data: history,
        pagination,
    }))
}

pub async fn delete_scholar(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    require_admin(&claims)?;

    let scholar_id = path.into_inner();
    app_state.db.delete_scholar(&scholar_id).await?;

    app_state.cache.invalidate_pattern("/api/scholars").await;
    app_state.cache.invalidate_pattern("/api/tags").await;
    app_state.cache.invalidate_pattern("/api/news").await;

    Ok(HttpResponse::NoContent().finish())
}
