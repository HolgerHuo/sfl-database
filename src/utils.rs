use crate::db::Database;
use crate::middleware::CacheMiddleware;
use actix_web::{HttpResponse, error::ResponseError, http::StatusCode};
use openidconnect::{ClientId, ClientSecret, IssuerUrl, reqwest};
use serde::Serialize;
use thiserror::Error;

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub jwt_secret: String,
    pub oidc_http_client: reqwest::Client,
    pub oidc_issuer_url: IssuerUrl,
    pub oidc_client_id: ClientId,
    pub oidc_client_secret: ClientSecret,
    pub cache: CacheMiddleware,
}

impl AppState {
    pub async fn new(
        db: Database,
        jwt_secret: String,
        oidc_issuer_url: String,
        oidc_client_id: String,
        oidc_client_secret: String,
        cache: CacheMiddleware,
    ) -> Self {
        let oidc_http_client = reqwest::ClientBuilder::new()
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .expect("Failed to build HTTP client");
        let oidc_issuer_url = IssuerUrl::new(oidc_issuer_url).expect("Invalid OIDC issuer URL");
        let oidc_client_id = ClientId::new(oidc_client_id);
        let oidc_client_secret = ClientSecret::new(oidc_client_secret);

        Self {
            db,
            jwt_secret,
            oidc_http_client,
            oidc_issuer_url,
            oidc_client_id,
            oidc_client_secret,
            cache,
        }
    }
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Internal server error: {0}")]
    InternalError(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("JWT error: {0}")]
    JwtError(#[from] jsonwebtoken::errors::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("HTTP client error: {0}")]
    ReqwestError(#[from] reqwest::Error),

    #[error("JSON serialization error: {0}")]
    SerdeJsonError(#[from] serde_json::Error),
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        let (status, error_response) = match self {
            AppError::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                ErrorResponse {
                    error: "Not Found".to_string(),
                    message: Some(msg.clone()),
                    details: None,
                },
            ),
            AppError::Unauthorized(msg) => (
                StatusCode::UNAUTHORIZED,
                ErrorResponse {
                    error: "Unauthorized".to_string(),
                    message: Some(msg.clone()),
                    details: None,
                },
            ),
            AppError::Forbidden(msg) => (
                StatusCode::FORBIDDEN,
                ErrorResponse {
                    error: "Forbidden".to_string(),
                    message: Some(msg.clone()),
                    details: None,
                },
            ),
            AppError::BadRequest(msg) | AppError::ValidationError(msg) => (
                StatusCode::BAD_REQUEST,
                ErrorResponse {
                    error: "Bad Request".to_string(),
                    message: Some(msg.clone()),
                    details: None,
                },
            ),
            AppError::Conflict(msg) => (
                StatusCode::CONFLICT,
                ErrorResponse {
                    error: "Conflict".to_string(),
                    message: Some(msg.clone()),
                    details: None,
                },
            ),
            AppError::DatabaseError(e) => {
                log::error!("Database error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ErrorResponse {
                        error: "Internal Server Error".to_string(),
                        message: Some("A database error occurred".to_string()),
                        details: None,
                    },
                )
            }
            _ => {
                log::error!("Internal error: {}", self);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ErrorResponse {
                        error: "Internal Server Error".to_string(),
                        message: Some("An unexpected error occurred".to_string()),
                        details: None,
                    },
                )
            }
        };

        HttpResponse::build(status).json(error_response)
    }

    fn status_code(&self) -> StatusCode {
        match self {
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            AppError::Forbidden(_) => StatusCode::FORBIDDEN,
            AppError::BadRequest(_) | AppError::ValidationError(_) => StatusCode::BAD_REQUEST,
            AppError::Conflict(_) => StatusCode::CONFLICT,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;
