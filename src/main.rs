mod constants;
mod db;
mod handlers;
mod middleware;
mod models;
mod utils;

use actix_cors::Cors;
use actix_files as fs;
use actix_web::{App, HttpResponse, HttpServer, web};
use dotenvy::dotenv;
use std::env;
use std::time::Duration;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let base_url = env::var("BASE_URL").unwrap_or_else(|_| format!("http://{}:{}", host, port));
    let oidc_issuer_url = env::var("OIDC_ISSUER_URL").expect("OIDC_ISSUER_URL must be set");
    let oidc_client_id = env::var("OIDC_CLIENT_ID").expect("OIDC_CLIENT_ID must be set");
    let oidc_client_secret =
        env::var("OIDC_CLIENT_SECRET").expect("OIDC_CLIENT_SECRET must be set");
    let db = db::Database::new(&database_url)
        .await
        .expect("Failed to initialize database");

    let cache_middleware = middleware::CacheMiddleware::new();

    let app_state = utils::AppState::new(
        db,
        jwt_secret,
        oidc_issuer_url,
        oidc_client_id,
        oidc_client_secret,
        cache_middleware.clone(),
    )
    .await;
    log::info!("Application initialized");

    let cleanup_db = app_state.db.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(3600));
        loop {
            interval.tick().await;
            log::info!("Running scheduled cleanup of expired refresh tokens");
            match cleanup_db.cleanup_expired_tokens().await {
                Ok(count) => {
                    log::info!("Cleaned up {} expired refresh tokens", count);
                }
                Err(e) => {
                    log::error!("Failed to cleanup expired tokens: {}", e);
                }
            }
        }
    });
    log::info!("Started background cleanup task for expired tokens");

    let bind_address = format!("{}:{}", host, port);
    log::info!("Starting server at http://{}", bind_address);

    let auth_middleware = web::Data::new(middleware::AuthMiddleware);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin(&base_url)
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
            .allowed_headers(vec![
                actix_web::http::header::AUTHORIZATION,
                actix_web::http::header::CONTENT_TYPE,
                actix_web::http::header::ACCEPT,
            ])
            .supports_credentials()
            .max_age(3600);

        App::new()
            .app_data(web::Data::new(app_state.clone()))
            .app_data(auth_middleware.clone())
            .wrap(cors)
            .wrap(actix_web::middleware::Logger::default())
            .configure(|cfg| configure_routes(cfg, app_state.cache.clone()))
    })
    .bind(&bind_address)?
    .run()
    .await
}

fn configure_routes(cfg: &mut web::ServiceConfig, cache: middleware::CacheMiddleware) {
    cfg.route("/healthz", web::get().to(health_check))
        .service(web::scope("/api").configure(|api_cfg| configure_api_routes(api_cfg, cache)))
        .service(
            fs::Files::new("/uploads", "./uploads")
                .use_etag(true)
                .use_last_modified(true)
                .prefer_utf8(true),
        )
        .service(
            fs::Files::new("/", "./frontend/dist")
                .index_file("index.html")
                .use_etag(true)
                .use_last_modified(true)
                .prefer_utf8(true)
                .default_handler(web::to(|| async {
                    fs::NamedFile::open("./frontend/dist/index.html")
                        .map(|file| file.use_etag(true).use_last_modified(true))
                })),
        );
}

async fn health_check(app_state: web::Data<utils::AppState>) -> HttpResponse {
    match sqlx::query("SELECT 1").fetch_one(&app_state.db.pool).await {
        Ok(_) => HttpResponse::Ok().body("OK"),
        Err(e) => {
            log::error!("Health check failed - database unavailable: {}", e);
            HttpResponse::ServiceUnavailable().body("Database unavailable")
        }
    }
}

fn configure_api_routes(cfg: &mut web::ServiceConfig, cache: middleware::CacheMiddleware) {
    cfg.service(
        web::scope("/auth")
            .route("/login", web::get().to(handlers::auth::login))
            .route("/callback", web::get().to(handlers::auth::callback))
            .route("/refresh", web::post().to(handlers::auth::refresh))
            .route("/logout", web::post().to(handlers::auth::logout)),
    )
    .service(
        web::scope("/scholars")
            .wrap(cache.clone())
            .route("", web::get().to(handlers::scholars::list_scholars))
            .route("/{id}", web::get().to(handlers::scholars::get_scholar)),
    )
    .service(
        web::scope("/tags")
            .wrap(cache.clone())
            .route("", web::get().to(handlers::tags::list_tags))
            .route("/{id}", web::get().to(handlers::tags::get_tag)),
    )
    .service(
        web::scope("/news")
            .wrap(cache.clone())
            .route("", web::get().to(handlers::news::list_news))
            .route("/{id}", web::get().to(handlers::news::get_news)),
    )
    .service(
        web::scope("/identities")
            .wrap(cache.clone())
            .route("", web::get().to(handlers::identities::list_identities)),
    )
    .service(
        web::scope("/admin")
            .wrap(middleware::AuthMiddleware)
            .service(
                web::scope("/scholars")
                    .route("", web::get().to(handlers::scholars::list_all_scholars))
                    .route("", web::post().to(handlers::scholars::create_scholar))
                    .route("/{id}", web::get().to(handlers::scholars::get_scholar_admin))
                    .route("/{id}", web::put().to(handlers::scholars::update_scholar))
                    .route("/{id}", web::delete().to(handlers::scholars::delete_scholar))
                    .route(
                        "/{id}/history",
                        web::get().to(handlers::scholars::get_scholar_history),
                    ),
            )
            .service(
                web::scope("/news")
                    .route("", web::get().to(handlers::news::list_news))
                    .route("", web::post().to(handlers::news::create_news))
                    .route("/{id}", web::get().to(handlers::news::get_news))
                    .route("/{id}", web::put().to(handlers::news::update_news))
                    .route("/{id}", web::delete().to(handlers::news::delete_news)),
            )
            .service(
                web::scope("/tags")
                    .route("", web::get().to(handlers::tags::list_tags))
                    .route("", web::post().to(handlers::tags::create_tag))
                    .route("/{id}", web::get().to(handlers::tags::get_tag))
                    .route("/{id}", web::put().to(handlers::tags::update_tag))
                    .route("/{id}", web::delete().to(handlers::tags::delete_tag)),
            )
            .service(
                web::scope("/identities")
                    .route("", web::get().to(handlers::identities::list_identities))
                    .route("", web::post().to(handlers::identities::create_identity))
                    .route("/{id}", web::get().to(handlers::identities::get_identity))
                    .route("/{id}", web::put().to(handlers::identities::update_identity))
                    .route(
                        "/{id}",
                        web::delete().to(handlers::identities::delete_identity),
                    ),
            )
            .service(
                web::scope("/users")
                    .route("", web::get().to(handlers::users::list_users))
                    .route("/{id}", web::get().to(handlers::users::get_user))
                    .route("/{id}", web::put().to(handlers::users::update_user))
                    .route("/{id}", web::delete().to(handlers::users::delete_user)),
            )
            .service(
                web::scope("/images")
                    .route("", web::get().to(handlers::images::list_images))
                    .route("/upload", web::post().to(handlers::images::upload_image))
                    .route("/{id}", web::get().to(handlers::images::get_image))
                    .route("/{id}", web::delete().to(handlers::images::delete_image)),
            ),
    );
}
