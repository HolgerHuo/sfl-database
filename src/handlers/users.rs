use actix_web::{HttpRequest, HttpResponse, web};

use crate::middleware::{extract_claims, require_admin};
use crate::models::*;
use crate::utils::{AppResult, AppState};

pub async fn list_users(
    app_state: web::Data<AppState>,
    query: web::Query<UserQueryParams>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    require_admin(&claims)?;

    let (users, total) = app_state.db.list_users(&query).await?;
    let pagination = Pagination::new(query.pagination.page, query.pagination.page_size, total);

    Ok(HttpResponse::Ok().json(UserListResponse {
        data: users,
        pagination,
    }))
}

pub async fn get_user(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    require_admin(&claims)?;

    let user_id = path.into_inner();
    let user = app_state.db.get_user(&user_id).await?;
    Ok(HttpResponse::Ok().json(user))
}

pub async fn update_user(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    input: web::Json<UserUpdateInput>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;
    require_admin(&claims)?;

    let user_id = path.into_inner();
    let user = app_state.db.update_user(&user_id, &input).await?;
    Ok(HttpResponse::Ok().json(user))
}
