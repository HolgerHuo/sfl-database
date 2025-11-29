use actix_web::{HttpRequest, HttpResponse, web};

use crate::middleware::{extract_claims, require_admin, validate_input};
use crate::models::*;
use crate::utils::{AppResult, AppState};

pub async fn list_tags(app_state: web::Data<AppState>) -> AppResult<HttpResponse> {
    let tags = app_state.db.list_tags().await?;
    Ok(HttpResponse::Ok().json(TagListResponse { data: tags }))
}

pub async fn create_tag(
    app_state: web::Data<AppState>,
    input: web::Json<TagRequest>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    require_admin(&claims)?;
    validate_input(&*input)?;

    let tag = app_state.db.create_tag(&input, &claims.user_id).await?;
    Ok(HttpResponse::Created().json(tag))
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

    let tag_id = path.into_inner();
    let tag = app_state
        .db
        .update_tag(&tag_id, &input, &claims.user_id)
        .await?;
    Ok(HttpResponse::Ok().json(tag))
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
    Ok(HttpResponse::NoContent().finish())
}
