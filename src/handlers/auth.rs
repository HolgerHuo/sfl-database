// placeholder, not used

use actix_web::{
    HttpRequest, HttpResponse,
    cookie::{Cookie, SameSite, time::Duration},
    web,
};
use chrono::Utc;
use jsonwebtoken::{EncodingKey, Header, encode};
use openidconnect::{
    AccessTokenHash, AuthorizationCode, Client, ClientId, ClientSecret, CsrfToken,
    EmptyAdditionalClaims, EndpointMaybeSet, EndpointNotSet, EndpointSet, IssuerUrl, Nonce,
    OAuth2TokenResponse, PkceCodeChallenge, PkceCodeVerifier, RedirectUrl, Scope,
    StandardErrorResponse, TokenResponse as OidcTokenResponse,
    core::{
        CoreAuthDisplay, CoreAuthPrompt, CoreAuthenticationFlow, CoreClient, CoreErrorResponseType,
        CoreGenderClaim, CoreJsonWebKey, CoreJweContentEncryptionAlgorithm, CoreProviderMetadata,
        CoreRevocableToken, CoreRevocationErrorResponse, CoreTokenIntrospectionResponse,
        CoreTokenResponse, CoreUserInfoClaims,
    },
    reqwest,
};
use serde::{Deserialize, Serialize};
use subtle::ConstantTimeEq;

use crate::constants::*;
use crate::db;
use crate::models::*;
use crate::utils::AppState;
use crate::utils::{AppError, AppResult};

// Session data structure for OIDC flow
#[derive(Debug, Serialize, Deserialize)]
struct OidcSession {
    pkce_verifier: String,
    csrf_token: String,
    nonce: String,
}

#[derive(Debug, Deserialize)]
pub struct OidcCallbackQuery {
    pub code: String,
    pub state: String,
}

pub type ApplicationOidcClient<
    HasAuthUrl = EndpointSet,
    HasDeviceAuthUrl = EndpointNotSet,
    HasIntrospectionUrl = EndpointNotSet,
    HasRevocationUrl = EndpointNotSet,
    HasTokenUrl = EndpointMaybeSet,
    HasUserInfoUrl = EndpointMaybeSet,
> = Client<
    EmptyAdditionalClaims,
    CoreAuthDisplay,
    CoreGenderClaim,
    CoreJweContentEncryptionAlgorithm,
    CoreJsonWebKey,
    CoreAuthPrompt,
    StandardErrorResponse<CoreErrorResponseType>,
    CoreTokenResponse,
    CoreTokenIntrospectionResponse,
    CoreRevocableToken,
    CoreRevocationErrorResponse,
    HasAuthUrl,
    HasDeviceAuthUrl,
    HasIntrospectionUrl,
    HasRevocationUrl,
    HasTokenUrl,
    HasUserInfoUrl,
>;

/// Constant-time comparison for CSRF tokens to prevent timing attacks
fn constant_time_compare(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.as_bytes().ct_eq(b.as_bytes()).into()
}

// Helper function to create OIDC client
async fn create_oidc_client(
    http_client: &reqwest::Client,
    issuer_url: &IssuerUrl,
    client_id: &ClientId,
    client_secret: &ClientSecret,
) -> AppResult<ApplicationOidcClient> {
    // Construct redirect URI from BASE_URL
    let base_url = std::env::var("BASE_URL")
        .map_err(|_| AppError::InternalError("BASE_URL not configured".to_string()))?;
    let redirect_uri = format!("{}/api/auth/callback", base_url);

    // Discover OIDC provider metadata
    let provider_metadata = CoreProviderMetadata::discover_async(issuer_url.clone(), http_client)
        .await
        .map_err(|e| {
            log::error!("Failed to discover OIDC provider: {}", e);
            AppError::InternalError(format!("Failed to discover OIDC provider: {}", e))
        })?;

    log::info!("Successfully discovered OIDC provider metadata");

    // Create OIDC client
    let client = CoreClient::from_provider_metadata(
        provider_metadata,
        client_id.clone(),
        Some(client_secret.clone()),
    )
    .set_redirect_uri(
        RedirectUrl::new(redirect_uri)
            .map_err(|e| AppError::InternalError(format!("Invalid redirect URI: {}", e)))?,
    );

    Ok(client)
}

pub async fn login(
    app_state: web::Data<AppState>,
    _query: web::Query<std::collections::HashMap<String, String>>,
) -> AppResult<HttpResponse> {
    log::info!("Starting OIDC login flow");

    // Create OIDC client using shared HTTP client
    let client = create_oidc_client(
        &app_state.oidc_http_client,
        &app_state.oidc_issuer_url,
        &app_state.oidc_client_id,
        &app_state.oidc_client_secret,
    )
    .await?;

    // Generate PKCE challenge
    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    // Generate authorization URL
    let (auth_url, csrf_token, nonce) = client
        .authorize_url(
            CoreAuthenticationFlow::AuthorizationCode,
            CsrfToken::new_random,
            Nonce::new_random,
        )
        .add_scope(Scope::new("openid".to_string()))
        .add_scope(Scope::new("email".to_string()))
        .add_scope(Scope::new("profile".to_string()))
        .set_pkce_challenge(pkce_challenge)
        .url();

    // Create session data
    let session = OidcSession {
        pkce_verifier: pkce_verifier.secret().to_string(),
        csrf_token: csrf_token.secret().to_string(),
        nonce: nonce.secret().to_string(),
    };

    // Serialize session data
    let session_json = serde_json::to_string(&session)
        .map_err(|e| AppError::InternalError(format!("Failed to serialize session: {}", e)))?;

    // Encode session data as base64 for cookie
    let session_b64 = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        session_json.as_bytes(),
    );

    log::info!("Generated OIDC session");

    // Store session in HTTP-only, secure, SameSite cookie
    let cookie = Cookie::build(OIDC_SESSION_COOKIE_NAME, session_b64)
        .path("/")
        .http_only(true)
        .secure(true)
        .same_site(SameSite::Lax)
        .max_age(Duration::seconds(OIDC_SESSION_EXPIRY_SECS))
        .finish();

    Ok(HttpResponse::TemporaryRedirect()
        .cookie(cookie)
        .append_header(("Location", auth_url.to_string()))
        .finish())
}

pub async fn callback(
    app_state: web::Data<AppState>,
    req: HttpRequest,
    query: web::Query<OidcCallbackQuery>,
) -> AppResult<HttpResponse> {
    log::info!("OIDC callback received");

    // Retrieve session from cookie
    let session_cookie = req.cookie("oidc_session").ok_or_else(|| {
        log::error!("OIDC session cookie not found");
        AppError::BadRequest("OIDC session not found. Please try logging in again.".to_string())
    })?;

    // Decode session data
    let session_json = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        session_cookie.value(),
    )
    .map_err(|e| {
        log::error!("Failed to decode session cookie: {}", e);
        AppError::InternalError("Invalid session data".to_string())
    })?;

    let session: OidcSession = serde_json::from_slice(&session_json).map_err(|e| {
        log::error!("Failed to deserialize session: {}", e);
        AppError::InternalError("Invalid session format".to_string())
    })?;

    // Validate CSRF token using constant-time comparison
    if !constant_time_compare(&query.state, &session.csrf_token) {
        log::error!("CSRF token mismatch - possible attack");
        return Err(AppError::BadRequest("Invalid state parameter".to_string()));
    }

    log::info!("CSRF token validated successfully");

    // Create OIDC client
    let client = create_oidc_client(
        &app_state.oidc_http_client,
        &app_state.oidc_issuer_url,
        &app_state.oidc_client_id,
        &app_state.oidc_client_secret,
    )
    .await?;

    // Create PKCE verifier from session
    let pkce_verifier = PkceCodeVerifier::new(session.pkce_verifier);

    log::info!("Exchanging authorization code for tokens...");

    // Exchange authorization code for token with PKCE verifier
    let token_response = client
        .exchange_code(AuthorizationCode::new(query.code.clone()))
        .map_err(|e| AppError::InternalError(format!("Failed to exchange OIDC code: {}", e)))?
        .set_pkce_verifier(pkce_verifier)
        .request_async(&app_state.oidc_http_client)
        .await
        .map_err(|e| {
            log::error!("Failed to exchange code: {:?}", e);
            AppError::InternalError(format!("Failed to exchange code: {}", e))
        })?;

    log::info!("Successfully exchanged code for tokens");

    // Reconstruct nonce from session for ID token verification
    let nonce = Nonce::new(session.nonce);

    let id_token = token_response
        .id_token()
        .ok_or_else(|| AppError::InternalError(format!("Server did not return an ID token")))?;
    let id_token_verifier = client.id_token_verifier();
    let claims = id_token
        .claims(&id_token_verifier, &nonce)
        .map_err(|e| AppError::InternalError(format!("Failed to verify ID token: {}", e)))?;

    // Verify the access token hash to ensure that the access token hasn't been substituted
    if let Some(expected_access_token_hash) = claims.access_token_hash() {
        let actual_access_token_hash = AccessTokenHash::from_token(
            token_response.access_token(),
            id_token.signing_alg().map_err(|e| {
                AppError::InternalError(format!("Failed to get signing algorithm: {}", e))
            })?,
            id_token.signing_key(&id_token_verifier).map_err(|e| {
                AppError::InternalError(format!("Failed to get signing key: {}", e))
            })?,
        )
        .map_err(|e| {
            AppError::InternalError(format!("Failed to compute access token hash: {}", e))
        })?;

        if actual_access_token_hash != *expected_access_token_hash {
            log::error!("Access token hash mismatch - possible token substitution attack");
            return Err(AppError::Unauthorized("Invalid access token".to_string()));
        }
    }

    log::info!("ID token and access token verified successfully");

    // Get user info
    log::info!("Fetching user info from OIDC provider");
    let userinfo: CoreUserInfoClaims = client
        .user_info(token_response.access_token().to_owned(), None)
        .map_err(|e| {
            log::error!("Failed to get userinfo endpoint: {}", e);
            AppError::InternalError("Authentication failed".to_string())
        })?
        .request_async(&app_state.oidc_http_client)
        .await
        .map_err(|e| {
            log::error!("Failed to get user info: {}", e);
            AppError::InternalError(format!("Failed to get user info: {}", e))
        })?;

    log::info!("Successfully retrieved user info");

    // Extract user information
    let sub = userinfo.subject().as_str().to_string();
    let email = userinfo
        .email()
        .map(|e| e.as_str().to_string())
        .ok_or_else(|| {
            log::error!("Email not provided by OIDC provider");
            AppError::BadRequest("Email not provided by OIDC provider".to_string())
        })?;
    let name = userinfo
        .name()
        .and_then(|n| n.get(None))
        .map(|n| n.as_str().to_string());

    log::info!(
        "User info - sub: {}, email: {}, name: {:?}",
        sub,
        email,
        name
    );

    // Get or create user
    log::info!("Looking up user by OIDC sub: {}", sub);
    let user = match app_state.db.get_user_by_oidc_sub(&sub).await? {
        Some(existing_user) => {
            log::info!("Found existing user: {}", existing_user.id);
            // Update last login
            app_state.db.update_last_login(&existing_user.id).await?;
            existing_user
        }
        None => {
            log::info!("Creating new user (editor role by default)");
            // Create new user as editor by default
            // Admin must promote user to moderator or admin to grant additional permissions
            let new_user = app_state
                .db
                .create_user(&sub, &email, name.as_deref(), UserRole::Editor)
                .await?;
            log::info!("Created new user: {} (editor)", new_user.id);
            new_user
        }
    };

    // Check if user is active
    if !user.active {
        log::warn!("User account is inactive: {}", user.id);
        return Err(AppError::Forbidden("User account is inactive".to_string()));
    }

    // Generate session ID for session binding
    let _session_id = cuid2::create_id();

    // Generate JWT with session binding
    let now = Utc::now().timestamp();
    let expires_in = JWT_ACCESS_TOKEN_EXPIRY_SECS;
    let claims = Claims {
        sub: user.oidc_sub.clone(),
        user_id: user.id.clone(),
        email: user.email.clone(),
        role: user.role.clone(),
        exp: now + expires_in,
        iat: now,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(app_state.jwt_secret.as_bytes()),
    )
    .map_err(|e| {
        log::error!("Failed to generate JWT: {}", e);
        AppError::InternalError(format!("Failed to generate JWT: {}", e))
    })?;

    // Generate refresh token
    let refresh_token = cuid2::create_id();

    // Extract user agent and IP address for audit
    let _user_agent = req
        .headers()
        .get("user-agent")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    let _ip_address = req
        .connection_info()
        .realip_remote_addr()
        .map(|s| s.to_string());

    // Store refresh token in database
    app_state
        .db
        .create_refresh_token(&user.id, &refresh_token)
        .await?;

    log::info!("Successfully authenticated user: {}", user.id);

    // Set refresh token as secure HTTP-only cookie
    let refresh_cookie = Cookie::build(REFRESH_TOKEN_COOKIE_NAME, refresh_token.clone())
        .path("/")
        .http_only(true)
        .secure(true)
        .same_site(SameSite::Strict)
        .max_age(Duration::seconds(REFRESH_TOKEN_EXPIRY_SECS))
        .finish();

    // Clear the OIDC session cookie
    let clear_cookie = Cookie::build(OIDC_SESSION_COOKIE_NAME, "")
        .path("/")
        .http_only(true)
        .max_age(Duration::seconds(0))
        .finish();

    // Use BASE_URL for frontend redirect
    let base_url =
        std::env::var("BASE_URL").unwrap_or_else(|_| "http://127.0.0.1:5173".to_string());

    // Encode the auth response as URL parameters
    let auth_data = serde_json::to_string(&AuthResponse {
        access_token: token,
        refresh_token,
        expires_in,
        token_type: "Bearer".to_string(),
        user,
    })
    .map_err(|e| AppError::InternalError(format!("Failed to serialize auth response: {}", e)))?;

    // Base64 encode the auth data for URL safety
    let auth_data_b64 = base64::Engine::encode(
        &base64::engine::general_purpose::URL_SAFE,
        auth_data.as_bytes(),
    );

    // Redirect to frontend with auth data
    let redirect_url = format!("{}/auth/callback?auth={}", base_url, auth_data_b64);

    log::info!("Redirecting to frontend: {}", redirect_url);

    Ok(HttpResponse::TemporaryRedirect()
        .cookie(refresh_cookie)
        .cookie(clear_cookie)
        .append_header(("Location", redirect_url))
        .finish())
}

pub async fn refresh(
    app_state: web::Data<AppState>,
    req: HttpRequest,
    body: Option<web::Json<RefreshTokenRequest>>,
) -> AppResult<HttpResponse> {
    log::info!("Processing refresh token request");

    let refresh_token = body
        .as_ref()
        .map(|b| b.refresh_token.clone())
        .or_else(|| {
            req.cookie(REFRESH_TOKEN_COOKIE_NAME)
                .map(|cookie| cookie.value().to_string())
        })
        .ok_or_else(|| {
            log::warn!("Refresh request missing token in both body and cookie");
            AppError::Unauthorized("Missing refresh token".to_string())
        })?;

    // Hash the provided refresh token
    let token_hash = db::refresh_tokens::hash_token(&refresh_token);

    // Look up the refresh token
    let refresh_token_record = app_state
        .db
        .get_refresh_token_by_hash(&token_hash)
        .await?
        .ok_or_else(|| {
            log::error!("Invalid or expired refresh token");
            AppError::Unauthorized("Invalid or expired refresh token".to_string())
        })?;

    // Get the user
    let user = app_state
        .db
        .get_user(&refresh_token_record.user)
        .await?;

    // Check if user is still active
    if !user.active {
        log::warn!("Attempted refresh for inactive user: {}", user.id);
        return Err(AppError::Forbidden("User account is inactive".to_string()));
    }

    // Update last used timestamp
    app_state
        .db
        .update_last_used(&refresh_token_record.id)
        .await?;

    // Generate new JWT
    let now = Utc::now().timestamp();
    let claims = Claims {
        sub: user.oidc_sub.clone(),
        user_id: user.id.clone(),
        email: user.email.clone(),
        role: user.role.clone(),
        exp: now + JWT_ACCESS_TOKEN_EXPIRY_SECS,
        iat: now,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(app_state.jwt_secret.as_bytes()),
    )
    .map_err(|e| {
        log::error!("Failed to generate JWT: {}", e);
        AppError::InternalError("Failed to generate token".to_string())
    })?;

    log::info!("Successfully refreshed token for user: {}", user.id);

    Ok(HttpResponse::Ok().json(crate::models::TokenResponse {
        access_token: token,
        expires_in: JWT_ACCESS_TOKEN_EXPIRY_SECS,
        token_type: "Bearer".to_string(),
    }))
}

pub async fn logout(app_state: web::Data<AppState>, req: HttpRequest) -> AppResult<HttpResponse> {
    // Extract claims from the request to get user_id
    if let Ok(claims) = crate::middleware::extract_claims(&req) {
        log::info!("Logging out user: {}", claims.user_id);

        // Revoke all refresh tokens for this user
        if let Err(e) = app_state.db.revoke_all_user_tokens(&claims.user_id).await {
            log::error!("Failed to revoke user tokens: {}", e);
            // Continue with logout even if revocation fails
        }

        log::info!("Successfully revoked tokens for user: {}", claims.user_id);
    } else {
        log::warn!("Logout called without valid authentication");
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Logged out successfully"
    })))
}
