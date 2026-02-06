use actix_web::{
    Error, HttpMessage, HttpResponse,
    body::{BoxBody, MessageBody},
    dev::{Service, ServiceRequest, ServiceResponse, Transform, forward_ready},
    web,
};
use futures_util::future::LocalBoxFuture;
use jsonwebtoken::{DecodingKey, Validation, decode};
use moka::future::Cache;
use std::future::{Ready, ready};
use std::sync::Arc;
use std::time::Duration;

use crate::models::Claims;
use crate::utils::AppError;
use crate::utils::AppState;

pub struct AuthMiddleware;

impl<S, B> Transform<S, ServiceRequest> for AuthMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = AuthMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddlewareService { service }))
    }
}

pub struct AuthMiddlewareService<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for AuthMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let app_state = req.app_data::<web::Data<AppState>>();

        let jwt_secret = match app_state {
            Some(state) => state.jwt_secret.clone(),
            None => {
                return Box::pin(async move {
                    Err(AppError::InternalError("AppState not found".to_string()).into())
                });
            }
        };

        let token = req
            .headers()
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .and_then(|h| {
                if h.starts_with("Bearer ") {
                    Some(h[7..].to_string())
                } else {
                    None
                }
            });

        if let Some(token) = token {
            match decode::<Claims>(
                &token,
                &DecodingKey::from_secret(jwt_secret.as_bytes()),
                &Validation::default(),
            ) {
                Ok(token_data) => {
                    req.extensions_mut().insert(token_data.claims);
                }
                Err(_) => {
                    return Box::pin(async move {
                        Err(AppError::Unauthorized("Invalid token".to_string()).into())
                    });
                }
            }
        } else {
            return Box::pin(async move {
                Err(AppError::Unauthorized("Missing authorization token".to_string()).into())
            });
        }

        let fut = self.service.call(req);
        Box::pin(async move {
            let res = fut.await?;
            Ok(res)
        })
    }
}

pub fn extract_claims(req: &actix_web::HttpRequest) -> Result<Claims, AppError> {
    req.extensions()
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| AppError::Unauthorized("No claims found".to_string()))
}

pub fn require_admin(claims: &Claims) -> Result<(), AppError> {
    if !claims.is_admin() {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }
    Ok(())
}

pub fn require_moderator_or_admin(claims: &Claims) -> Result<(), AppError> {
    if !claims.can_approve() {
        return Err(AppError::Forbidden("Moderator or Admin access required".to_string()));
    }
    Ok(())
}

pub fn require_editor_or_above(_claims: &Claims) -> Result<(), AppError> {
    // All roles (editor, moderator, admin) can access
    Ok(())
}

pub fn can_modify_directly(claims: &Claims) -> bool {
    // Only moderators and admins can modify content directly
    // Editors must submit for approval
    claims.can_approve()
}

pub fn validate_input<T: validator::Validate>(input: &T) -> Result<(), AppError> {
    input
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))
}

#[derive(Clone)]
pub struct CacheMiddleware {
    cache: Arc<Cache<String, CachedResponse>>,
}

#[derive(Clone)]
struct CachedResponse {
    status: u16,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
}

impl CacheMiddleware {
    pub fn new() -> Self {
        let cache = Cache::builder()
            .time_to_live(Duration::from_secs(60)) // 1 minute TTL
            .support_invalidation_closures()
            .build();

        Self {
            cache: Arc::new(cache),
        }
    }

    pub async fn invalidate_pattern(&self, pattern: &str) {
        let pattern = pattern.to_string();
        self.cache.invalidate_entries_if(move |key, _| {
            key.starts_with(&pattern)
        }).expect("Failed to invalidate cache");
    }

    fn generate_cache_key(req: &ServiceRequest) -> String {
        let path = req.path();
        let query = req.query_string();

        if query.is_empty() {
            path.to_string()
        } else {
            format!("{}?{}", path, query)
        }
    }
}

impl<S, B> Transform<S, ServiceRequest> for CacheMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type InitError = ();
    type Transform = CacheMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(CacheMiddlewareService {
            service: Arc::new(service),
            cache: self.cache.clone(),
        }))
    }
}

pub struct CacheMiddlewareService<S> {
    service: Arc<S>,
    cache: Arc<Cache<String, CachedResponse>>,
}

impl<S, B> Service<ServiceRequest> for CacheMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        if req.method() != actix_web::http::Method::GET {
            let fut = self.service.call(req);
            return Box::pin(async move {
                let res = fut.await?;
                Ok(res.map_into_boxed_body())
            });
        }

        let cache_key = CacheMiddleware::generate_cache_key(&req);
        let cache = self.cache.clone();
        let service = self.service.clone();

        Box::pin(async move {
            let cached_response = cache.get(&cache_key).await;

            if let Some(cached) = cached_response {
                let mut response = HttpResponse::build(
                    actix_web::http::StatusCode::from_u16(cached.status)
                        .unwrap_or(actix_web::http::StatusCode::OK),
                );

                for (name, value) in &cached.headers {
                    if let Ok(header_name) =
                        actix_web::http::header::HeaderName::from_bytes(name.as_bytes())
                    {
                        if let Ok(header_value) =
                            actix_web::http::header::HeaderValue::from_bytes(value.as_bytes())
                        {
                            response.insert_header((header_name, header_value));
                        }
                    }
                }

                response.insert_header(("X-Cache", "HIT"));

                let http_response = response.body(cached.body.clone());
                let (http_req, _) = req.into_parts();
                let service_response = ServiceResponse::new(http_req, http_response);

                return Ok(service_response);
            }

            let res = service.call(req).await?;

            let (http_req, http_res) = res.into_parts();
            let status = http_res.status().as_u16();

            if status >= 200 && status < 300 {
                let headers: Vec<(String, String)> = http_res
                    .headers()
                    .iter()
                    .filter_map(|(name, value)| {
                        value
                            .to_str()
                            .ok()
                            .map(|v| (name.to_string(), v.to_string()))
                    })
                    .collect();

                use actix_web::body::to_bytes;
                let body_bytes = to_bytes(http_res.into_body()).await.map_err(|_| {
                    actix_web::error::ErrorInternalServerError("Failed to read response body")
                })?;
                let body_vec = body_bytes.to_vec();

                let cached = CachedResponse {
                    status,
                    headers: headers.clone(),
                    body: body_vec.clone(),
                };

                let cache_key_clone = cache_key.clone();
                tokio::spawn(async move {
                    cache.insert(cache_key_clone, cached).await;
                });

                let mut response = HttpResponse::build(
                    actix_web::http::StatusCode::from_u16(status)
                        .unwrap_or(actix_web::http::StatusCode::OK),
                );

                for (name, value) in headers {
                    if let Ok(header_name) =
                        actix_web::http::header::HeaderName::from_bytes(name.as_bytes())
                    {
                        if let Ok(header_value) =
                            actix_web::http::header::HeaderValue::from_bytes(value.as_bytes())
                        {
                            response.insert_header((header_name, header_value));
                        }
                    }
                }

                response.insert_header(("X-Cache", "MISS"));

                let http_response = response.body(body_vec);
                Ok(ServiceResponse::new(http_req, http_response))
            } else {
                let http_response = HttpResponse::build(
                    actix_web::http::StatusCode::from_u16(status)
                        .unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR),
                )
                .finish();
                Ok(ServiceResponse::new(http_req, http_response))
            }
        })
    }
}
