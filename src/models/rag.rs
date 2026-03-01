use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct RAGSearchRequest {
    /// The user's query or message
    pub query: String,
    /// Optional: maximum number of scholars to retrieve (default: 5)
    #[serde(default = "default_limit")]
    pub limit: i64,
    /// Optional: similarity threshold for vector search (0.0-1.0)
    #[serde(default = "default_threshold")]
    pub threshold: f32,
    /// Optional: include hidden scholars (default: false)
    #[serde(default)]
    pub include_hidden: bool,
    /// Optional: filter by identity names
    pub identities: Option<Vec<String>>,
    /// Optional: filter by tag names
    pub tags: Option<Vec<String>>,
}

fn default_limit() -> i64 {
    5
}

fn default_threshold() -> f32 {
    0.0
}

#[derive(Debug, Serialize)]
pub struct RAGSearchResponse {
    /// The user's original query
    pub query: String,
    /// Retrieved scholars relevant to the query
    pub retrieved_scholars: Vec<RAGScholarResult>,
    /// The LLM-generated response/chat message
    pub response: String,
    /// Number of scholars used in the context
    pub context_count: i32,
}

#[derive(Debug, Serialize)]
pub struct RAGScholarResult {
    pub id: String,
    pub name: String,
    pub field_of_research: String,
    pub introduction: String,
    pub social_influence: String,
    /// Similarity score (0.0-1.0) from vector search
    pub similarity_score: f32,
}

#[derive(Debug, Deserialize)]
pub struct RAGChatRequest {
    /// Conversation messages
    pub messages: Vec<ChatMessage>,
    /// Optional: maximum number of scholars to retrieve for context
    #[serde(default = "default_limit")]
    pub limit: i64,
    /// Optional: include hidden scholars (default: false)
    #[serde(default)]
    pub include_hidden: bool,
    /// Optional: filter by identity names
    pub identities: Option<Vec<String>>,
    /// Optional: filter by tag names
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    /// "user" or "assistant"
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct RAGChatResponse {
    /// The assistant's response message
    pub message: String,
    /// Retrieved scholars used in the context
    pub context_scholars: Vec<RAGScholarResult>,
    /// Number of scholars used
    pub context_count: i32,
}
