use actix_web::{HttpRequest, HttpResponse, web};

use crate::middleware::{extract_claims, require_admin, validate_input};
use crate::models::*;
use crate::utils::{AppResult, AppState};

pub async fn list_identities(app_state: web::Data<AppState>) -> AppResult<HttpResponse> {
    let identities = app_state.db.list_identities().await?;
    Ok(HttpResponse::Ok().json(IdentityListResponse { data: identities }))
}

pub async fn create_identity(
    app_state: web::Data<AppState>,
    input: web::Json<IdentityRequest>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    require_admin(&claims)?;
    validate_input(&*input)?;

    let identity = app_state
        .db
        .create_identity(&input, &claims.user_id)
        .await?;

    app_state.cache.invalidate_pattern("/api/identities").await;
    app_state.cache.invalidate_pattern("/api/scholars").await;

    Ok(HttpResponse::Created().json(identity))
}

pub async fn update_identity(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    input: web::Json<IdentityRequest>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    require_admin(&claims)?;
    validate_input(&*input)?;

    let identity_id = path.into_inner();
    let identity = app_state
        .db
        .update_identity(&identity_id, &input, &claims.user_id)
        .await?;

    app_state.cache.invalidate_pattern("/api/identities").await;
    app_state.cache.invalidate_pattern("/api/scholars").await;

    Ok(HttpResponse::Ok().json(identity))
}

pub async fn delete_identity(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    require_admin(&claims)?;

    let identity_id = path.into_inner();
    app_state.db.delete_identity(&identity_id).await?;

    app_state.cache.invalidate_pattern("/api/identities").await;
    app_state.cache.invalidate_pattern("/api/scholars").await;

    Ok(HttpResponse::NoContent().finish())
}
