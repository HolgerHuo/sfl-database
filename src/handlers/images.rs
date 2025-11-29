use actix_multipart::Multipart;
use actix_web::{HttpRequest, HttpResponse, web};
use futures_util::TryStreamExt;
use std::io::Write;
use std::path::Path;

use crate::middleware::extract_claims;
use crate::models::ImageRequest;
use crate::utils::{AppError, AppResult, AppState};

const UPLOAD_DIR: &str = "./uploads/images";
const MAX_FILE_SIZE: usize = 50 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "svg"];

pub async fn get_image(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
) -> AppResult<HttpResponse> {
    let image_id = path.into_inner();
    let image = app_state.db.get_image(&image_id).await?;
    Ok(HttpResponse::Ok().json(image))
}

pub async fn delete_image(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    let _claims = extract_claims(&req)?;
    let image_id = path.into_inner();

    let image = app_state.db.get_image(&image_id).await?;

    let filepath = Path::new(UPLOAD_DIR).join(&image.filename);
    if filepath.exists() {
        std::fs::remove_file(&filepath).map_err(|e| {
            log::error!("Failed to delete file {}: {}", filepath.display(), e);
            AppError::InternalError("Failed to delete file".to_string())
        })?;
        log::info!("Deleted file: {}", filepath.display());
    } else {
        log::warn!("File not found: {}", filepath.display());
    }

    app_state.db.delete_image(&image_id).await?;

    Ok(HttpResponse::NoContent().finish())
}

pub async fn upload_image(
    app_state: web::Data<AppState>,
    req: HttpRequest,
    input: web::Json<ImageRequest>,
    mut payload: Multipart,
) -> AppResult<HttpResponse> {
    let claims = extract_claims(&req)?;

    std::fs::create_dir_all(UPLOAD_DIR).map_err(|e| {
        log::error!("Failed to create upload directory: {}", e);
        AppError::InternalError("Failed to create upload directory".to_string())
    })?;

    let mut filename = String::new();
    let mut file_size = 0usize;
    let mut mime_type = String::new();

    while let Some(mut field) = payload.try_next().await.map_err(|e| {
        log::error!("Failed to read multipart field: {}", e);
        AppError::BadRequest("Invalid multipart data".to_string())
    })? {
        let content_disposition = field.content_disposition();

        let field_name = content_disposition
            .as_ref()
            .and_then(|cd| cd.get_name())
            .map(|s| s.to_string());

        if let Some(name) = field_name {
            if name == "file" {
                let original_filename = content_disposition
                    .as_ref()
                    .and_then(|cd| cd.get_filename())
                    .map(|s| s.to_string())
                    .ok_or_else(|| AppError::BadRequest("No filename provided".to_string()))?;

                let extension = Path::new(&original_filename)
                    .extension()
                    .and_then(|e| e.to_str())
                    .ok_or_else(|| AppError::BadRequest("Invalid file extension".to_string()))?
                    .to_lowercase();

                if !ALLOWED_EXTENSIONS.contains(&extension.as_str()) {
                    return Err(AppError::BadRequest(format!(
                        "File type not allowed. Allowed types: {}",
                        ALLOWED_EXTENSIONS.join(", ")
                    )));
                }

                mime_type = field
                    .content_type()
                    .map(|ct| ct.to_string())
                    .unwrap_or_else(|| "application/octet-stream".to_string());

                let image_id = cuid2::create_id();
                filename = format!("{}.{}", image_id, extension);
                let filepath = Path::new(UPLOAD_DIR).join(&filename);

                let mut file = std::fs::File::create(&filepath).map_err(|e| {
                    log::error!("Failed to create file: {}", e);
                    AppError::InternalError("Failed to save file".to_string())
                })?;

                while let Some(chunk) = field.try_next().await.map_err(|e| {
                    log::error!("Failed to read chunk: {}", e);
                    AppError::InternalError("Failed to read file data".to_string())
                })? {
                    file_size += chunk.len();

                    if file_size > MAX_FILE_SIZE {
                        let _ = std::fs::remove_file(&filepath);
                        return Err(AppError::BadRequest(format!(
                            "File size exceeds maximum of {} MB",
                            MAX_FILE_SIZE / (1024 * 1024)
                        )));
                    }

                    file.write_all(&chunk).map_err(|e| {
                        log::error!("Failed to write chunk: {}", e);
                        AppError::InternalError("Failed to write file data".to_string())
                    })?;
                }

                log::info!(
                    "Uploaded file: {} ({} bytes, {})",
                    filename,
                    file_size,
                    mime_type
                );
            }
        }
    }

    if filename.is_empty() {
        return Err(AppError::BadRequest("No file uploaded".to_string()));
    }

    let image = app_state.db.create_image(&input, &claims.user_id).await?;

    Ok(HttpResponse::Created().json(image))
}
