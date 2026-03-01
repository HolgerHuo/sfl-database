use actix_web::{HttpRequest, HttpResponse, web};
use serde_json::json;
use serde::Deserialize;

use crate::middleware::extract_claims;
use crate::models::{
    RAGChatRequest, RAGChatResponse, RAGScholarResult, RAGSearchRequest,
    RAGSearchResponse,
};
use crate::utils::{AppError, AppResult, AppState};

/// Generate embeddings for text using OpenAI API
async fn get_embedding(
    text: &str,
    app_state: &web::Data<AppState>,
) -> AppResult<Vec<f32>> {
    if app_state.llm_api_key.is_empty() {
        return Err(AppError::InternalError(
            "LLM_API_KEY not configured".to_string(),
        ));
    }

    let client = &app_state.oidc_http_client;
    let request_body = json!({
        "input": text,
        "model": app_state.embedding_model
    });

    let response = client
        .post(&format!("{}/embeddings", app_state.llm_base_url))
        .header("Authorization", format!("Bearer {}", app_state.llm_api_key))
        .json(&request_body)
        .send()
        .await
        .map_err(|e| AppError::InternalError(format!("Failed to call embedding API: {}", e)))?;

    if !response.status().is_success() {
        let text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(AppError::InternalError(format!(
            "Embedding API error: {}",
            text
        )));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::InternalError(format!("Failed to parse embedding response: {}", e)))?;

    let embedding = body
        .get("data")
        .and_then(|data| data.get(0))
        .and_then(|item| item.get("embedding"))
        .and_then(|emb| emb.as_array())
        .ok_or_else(|| AppError::InternalError("Invalid embedding response format".to_string()))?;

    let embedding_vec: Vec<f32> = embedding
        .iter()
        .filter_map(|v| v.as_f64().map(|f| f as f32))
        .collect();

    Ok(embedding_vec)
}

/// Call LLM chat API to generate a response based on context
async fn call_llm_chat(
    system_prompt: &str,
    user_message: &str,
    app_state: &web::Data<AppState>,
) -> AppResult<String> {
    if app_state.llm_api_key.is_empty() {
        return Err(AppError::InternalError(
            "LLM_API_KEY not configured".to_string(),
        ));
    }

    let client = &app_state.oidc_http_client;
    let request_body = json!({
        "model": app_state.chat_model,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_message
            }
        ],
        "temperature": 0.7,
        "max_tokens": 1000
    });

    let response = client
        .post(&format!("{}/chat/completions", app_state.llm_base_url))
        .header("Authorization", format!("Bearer {}", app_state.llm_api_key))
        .json(&request_body)
        .send()
        .await
        .map_err(|e| AppError::InternalError(format!("Failed to call LLM API: {}", e)))?;

    if !response.status().is_success() {
        let text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(AppError::InternalError(format!("LLM API error: {}", text)));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::InternalError(format!("Failed to parse LLM response: {}", e)))?;

    let message = body
        .get("choices")
        .and_then(|choices| choices.get(0))
        .and_then(|choice| choice.get("message"))
        .and_then(|msg| msg.get("content"))
        .and_then(|content| content.as_str())
        .ok_or_else(|| AppError::InternalError("Invalid LLM response format".to_string()))?;

    Ok(message.to_string())
}



/// RAG Chat endpoint
/// Multi-turn conversation with scholar knowledge
/// Requires editor or higher permission
pub async fn rag_chat(
    app_state: web::Data<AppState>,
    req: web::Json<RAGChatRequest>,
    _http_req: HttpRequest,
) -> AppResult<HttpResponse> {
    // Require authentication and editor+ permission for chat
    let claims = extract_claims(&_http_req)?;
    crate::middleware::require_ai_access(&claims)?;

    if req.messages.is_empty() {
        return Err(AppError::BadRequest(
            "At least one message is required".to_string(),
        ));
    }

    // Get the last user message for context retrieval
    let last_user_message = req
        .messages
        .iter()
        .rev()
        .find(|msg| msg.role == "user")
        .ok_or_else(|| AppError::BadRequest("No user message found".to_string()))?;

    // Generate embedding for the last user message
    let query_embedding = get_embedding(&last_user_message.content, &app_state).await?;

    // Search for similar scholars with filters
    let identities_ref = req.identities.as_deref();
    let tags_ref = req.tags.as_deref();
    
    let context_scholars: Vec<RAGScholarResult> = app_state
        .db
        .search_scholars_by_embedding_filtered(
            &query_embedding,
            req.limit,
            0.0,
            req.include_hidden,
            identities_ref,
            tags_ref,
        )
        .await?;

    // Build context
    let context = context_scholars
        .iter()
        .map(|s| {
            format!(
                "- {}: {} | Research: {} | Influence: {}",
                s.name, s.introduction, s.field_of_research, s.social_influence
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    // Build full system prompt with scholar context
    let system_prompt = format!(
        "You are a knowledgeable assistant helping users learn about scholars. \
        You have access to the following scholar information:\n\n{}\n\n\
        Use this information to answer questions accurately. Be helpful and provide detailed information. \
        IMPORTANT: Do not include scholar IDs in your responses.",
        if context.is_empty() {
            "No scholar information available for this query.".to_string()
        } else {
            context
        }
    );

    // Build messages for LLM
    let mut llm_messages = vec![
        json!({
            "role": "system",
            "content": system_prompt
        }),
    ];

    // Add conversation history
    for msg in &req.messages {
        llm_messages.push(json!({
            "role": msg.role,
            "content": msg.content
        }));
    }

    // Call LLM
    if app_state.llm_api_key.is_empty() {
        return Err(AppError::InternalError(
            "LLM_API_KEY not configured".to_string(),
        ));
    }

    let client = &app_state.oidc_http_client;
    let request_body = json!({
        "model": app_state.chat_model,
        "messages": llm_messages,
        "temperature": 0.7,
        "max_tokens": 1500
    });

    let response = client
        .post(&format!("{}/chat/completions", app_state.llm_base_url))
        .header("Authorization", format!("Bearer {}", app_state.llm_api_key))
        .json(&request_body)
        .send()
        .await
        .map_err(|e| AppError::InternalError(format!("Failed to call LLM API: {}", e)))?;

    if !response.status().is_success() {
        let text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(AppError::InternalError(format!("LLM API error: {}", text)));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::InternalError(format!("Failed to parse LLM response: {}", e)))?;

    let message = body
        .get("choices")
        .and_then(|choices| choices.get(0))
        .and_then(|choice| choice.get("message"))
        .and_then(|msg| msg.get("content"))
        .and_then(|content| content.as_str())
        .ok_or_else(|| AppError::InternalError("Invalid LLM response format".to_string()))?
        .to_string();

    let context_count = context_scholars.len() as i32;

    Ok(HttpResponse::Ok().json(RAGChatResponse {
        message,
        context_scholars,
        context_count,
    }))
}

/// Embed scholars - helper function to process embeddings
async fn embed_scholars(
    app_state: &web::Data<AppState>,
    scholars: Vec<crate::models::Scholar>,
) -> (i32, i32) {
    let mut embedded_count = 0;
    let mut failed_count = 0;

    for scholar in scholars {
        match app_state
            .db
            .build_scholar_embedding_text(&scholar.id)
            .await
        {
            Ok(embedding_text) => {
                match get_embedding(&embedding_text, app_state).await {
                    Ok(embedding) => {
                        match app_state
                            .db
                            .store_scholar_embedding(&scholar.id, &embedding_text, &embedding)
                            .await
                        {
                            Ok(_) => {
                                embedded_count += 1;
                                log::info!("Embedded scholar: {} ({})", scholar.name, scholar.id);
                            }
                            Err(e) => {
                                failed_count += 1;
                                log::error!(
                                    "Failed to store embedding for {}: {}",
                                    scholar.id, e
                                );
                            }
                        }
                    }
                    Err(e) => {
                        failed_count += 1;
                        log::error!("Failed to generate embedding for {}: {}", scholar.id, e);
                    }
                }
            }
            Err(e) => {
                failed_count += 1;
                log::error!("Failed to build embedding text for {}: {}", scholar.id, e);
            }
        }

        // Small delay to avoid rate limiting
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

    (embedded_count, failed_count)
}

/// Query parameters for batch embedding endpoint
#[derive(Deserialize)]
pub struct EmbedQuery {
    /// "missing" - only embed scholars without embeddings (default)
    /// "all" - reindex all visible scholars
    #[serde(default = "default_embed_mode")]
    pub mode: String,
}

fn default_embed_mode() -> String {
    "missing".to_string()
}

/// Admin endpoint to trigger batch embedding for scholars
/// Two modes: missing (only scholars without embeddings) or all (reindex all)
/// Requires admin permission
pub async fn batch_embed_scholars(
    app_state: web::Data<AppState>,
    query: web::Query<EmbedQuery>,
    _req: HttpRequest,
) -> AppResult<HttpResponse> {
    // Require admin authentication
    let claims = extract_claims(&_req)?;
    crate::middleware::require_admin(&claims)?;

    log::info!("Starting batch embedding (mode: {})...", query.mode);

    // Get scholars based on mode
    let scholars = match query.mode.as_str() {
        "all" => {
            // Reindex all visible scholars
            app_state.db.get_all_visible_scholars().await?
        }
        "missing" | _ => {
            // Get scholars without embeddings (default)
            app_state.db.get_scholars_without_embeddings().await?
        }
    };

    if scholars.is_empty() {
        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": match query.mode.as_str() {
                "all" => "No visible scholars found",
                _ => "All scholars are already embedded"
            },
            "embedded_count": 0,
            "failed_count": 0,
            "mode": query.mode
        })));
    }

    let (embedded_count, failed_count) = embed_scholars(&app_state, scholars).await;

    log::info!(
        "Batch embedding completed (mode: {}). Embedded: {}, Failed: {}",
        query.mode, embedded_count, failed_count
    );

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Batch embedding completed",
        "embedded_count": embedded_count,
        "failed_count": failed_count,
        "mode": query.mode
    })))
}

/// Embed a single scholar (used internally for auto-embedding on create/update)
pub async fn embed_single_scholar(
    app_state: &web::Data<AppState>,
    scholar_id: &str,
) -> AppResult<()> {
    match app_state
        .db
        .build_scholar_embedding_text(scholar_id)
        .await
    {
        Ok(embedding_text) => {
            match get_embedding(&embedding_text, app_state).await {
                Ok(embedding) => {
                    app_state
                        .db
                        .store_scholar_embedding(scholar_id, &embedding_text, &embedding)
                        .await?;
                    log::info!("Auto-embedded scholar: {}", scholar_id);
                    Ok(())
                }
                Err(e) => {
                    log::warn!("Failed to auto-embed scholar {}: {}", scholar_id, e);
                    Ok(()) // Don't fail the scholar creation
                }
            }
        }
        Err(e) => {
            log::warn!("Failed to build embedding text for scholar {}: {}", scholar_id, e);
            Ok(()) // Don't fail the scholar creation
        }
    }
}

/// Authenticated RAG Search endpoint
/// Search for scholars using semantic understanding and get LLM-generated response
/// Requires editor or higher permission
pub async fn rag_search_authenticated(
    app_state: web::Data<AppState>,
    req: HttpRequest,
    body: web::Json<RAGSearchRequest>,
) -> AppResult<HttpResponse> {
    // Require authentication and editor+ permission
    let claims = extract_claims(&req)?;
    crate::middleware::require_ai_access(&claims)?;
    
    log::info!("RAG search requested for query: {}", body.query);

    // Generate embedding for the query
    let query_embedding = get_embedding(&body.query, &app_state).await?;

    // Search for similar scholars in the database with filters
    let identities_ref = body.identities.as_deref();
    let tags_ref = body.tags.as_deref();
    
    let scholars: Vec<RAGScholarResult> = app_state
        .db
        .search_scholars_by_embedding_filtered(
            &query_embedding,
            body.limit,
            body.threshold,
            body.include_hidden,
            identities_ref,
            tags_ref,
        )
        .await?;

    if scholars.is_empty() {
        return Ok(HttpResponse::Ok().json(RAGSearchResponse {
            query: body.query.clone(),
            retrieved_scholars: vec![],
            response: "No relevant scholars found for your query.".to_string(),
            context_count: 0,
        }));
    }

    // Build context from retrieved scholars
    let context = scholars
        .iter()
        .map(|s| {
            format!(
                "- {}: {} | Research: {} | Influence: {}",
                s.name, s.introduction, s.field_of_research, s.social_influence
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    let system_prompt = format!(
        "You are a knowledgeable assistant helping users find information about scholars. \
        You have access to the following scholar information:\n\n{}\n\n\
        Use this information to answer the user's query accurately and helpfully. \
        If the information doesn't directly answer the query, explain what you know about related topics. \
        IMPORTANT: Do not include scholar IDs in your responses.",
        context
    );

    // Call LLM to generate response
    let llm_response = call_llm_chat(&system_prompt, &body.query, &app_state).await?;

    let context_count = scholars.len() as i32;

    Ok(HttpResponse::Ok().json(RAGSearchResponse {
        query: body.query.clone(),
        retrieved_scholars: scholars,
        response: llm_response,
        context_count,
    }))
}
