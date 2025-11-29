use actix_web::{HttpRequest, HttpResponse, web};

use crate::middleware::{extract_claims, require_admin, validate_input};
use crate::models::*;
use crate::utils::{AppResult, AppState};

pub async fn list_news(
    app_state: web::Data<AppState>,
    query: web::Query<NewsQuery>,
) -> AppResult<HttpResponse> {
    let (news_list, total) = app_state.db.list_news(&query).await?;

    let mut responses = Vec::new();
    for news in news_list {
        let scholar_ids = app_state.db.get_news_scholars(&news.id).await?;
        let scholars_map = app_state.db.get_scholars_info(&scholar_ids).await?;
        
        let scholars: Vec<ScholarInfo> = scholar_ids
            .iter()
            .filter_map(|id| scholars_map.get(id).cloned())
            .collect();
        
        responses.push(NewsResponse { news, scholars });
    }

    let pagination = Pagination::new(query.pagination.page, query.pagination.page_size, total);

    Ok(HttpResponse::Ok().json(NewsListResponse {
        data: responses,
        pagination,
    }))
}

pub async fn get_news(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
) -> AppResult<HttpResponse> {
    let news_id = path.into_inner();
    let news = app_state.db.get_news(&news_id).await?;
    let scholar_ids = app_state.db.get_news_scholars(&news_id).await?;
    let scholars_map = app_state.db.get_scholars_info(&scholar_ids).await?;
    
    let scholars: Vec<ScholarInfo> = scholar_ids
        .iter()
        .filter_map(|id| scholars_map.get(id).cloned())
        .collect();

    Ok(HttpResponse::Ok().json(NewsResponse { news, scholars }))
}

pub async fn create_news(
    app_state: web::Data<AppState>,
    input: web::Json<NewsRequest>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    validate_input(&*input)?;

    let news = app_state.db.create_news(&input, &claims.user_id).await?;
    let scholar_ids = app_state.db.get_news_scholars(&news.id).await?;
    let scholars_map = app_state.db.get_scholars_info(&scholar_ids).await?;
    
    let scholars: Vec<ScholarInfo> = scholar_ids
        .iter()
        .filter_map(|id| scholars_map.get(id).cloned())
        .collect();

    Ok(HttpResponse::Created().json(NewsResponse { news, scholars }))
}

pub async fn update_news(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    input: web::Json<NewsRequest>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    let news_id = path.into_inner();
    validate_input(&*input)?;

    let news = app_state
        .db
        .update_news(&news_id, &input, &claims.user_id)
        .await?;
    let scholar_ids = app_state.db.get_news_scholars(&news_id).await?;
    let scholars_map = app_state.db.get_scholars_info(&scholar_ids).await?;
    
    let scholars: Vec<ScholarInfo> = scholar_ids
        .iter()
        .filter_map(|id| scholars_map.get(id).cloned())
        .collect();

    Ok(HttpResponse::Ok().json(NewsResponse { news, scholars }))
}

pub async fn delete_news(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    require_admin(&claims)?;

    let news_id = path.into_inner();
    app_state.db.delete_news(&news_id).await?;

    Ok(HttpResponse::NoContent().finish())
}
