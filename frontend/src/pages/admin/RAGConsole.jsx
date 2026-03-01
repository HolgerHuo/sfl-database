import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../api';

const PLACEHOLDER_PROMPTS = [
  '哪位同学积极参与志愿活动？',
  '哪位老师撰写了与普希金有关的专著？',
  '寻找积极参加社会实践的研究生。',
];

const STORAGE_KEY = 'rag_console_sessions';

export default function RAGConsole() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingSessionName, setEditingSessionName] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_PROMPTS[0]);
  const [filters, setFilters] = useState({
    includeHidden: false,
    identities: [],
    tags: [],
  });
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [newSessionName, setNewSessionName] = useState('');
  const messagesEndRef = useRef(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
          setMessages(parsed[0].messages || []);
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
      }
    } else {
      // Create initial session
      createNewSession('默认对话');
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  // Save current messages to current session
  useEffect(() => {
    if (currentSessionId) {
      setSessions(prev =>
        prev.map(s =>
          s.id === currentSessionId ? { ...s, messages } : s
        )
      );
    }
  }, [messages, currentSessionId]);

  // Set random placeholder on mount and periodically
  useEffect(() => {
    const newPlaceholder = PLACEHOLDER_PROMPTS[Math.floor(Math.random() * PLACEHOLDER_PROMPTS.length)];
    setPlaceholder(newPlaceholder);
  }, []);

  const createNewSession = (name) => {
    const id = Date.now().toString();
    const newSession = { id, name, messages: [], createdAt: new Date().toISOString() };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(id);
    setMessages([]);
    setNewSessionName('');
  };

  const deleteSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
        setMessages(remaining[0].messages || []);
      }
    }
  };

  const switchSession = (id) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages || []);
      setEditingSessionId(null);
    }
  };

  const renameSession = (id, newName) => {
    if (!newName.trim()) return;
    setSessions(prev =>
      prev.map(s =>
        s.id === id ? { ...s, name: newName.trim() } : s
      )
    );
    setEditingSessionId(null);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await api.ragChat(
        [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: userMessage }],
        filters,
        token
      );

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.message,
          scholars: response.context_scholars,
          contextCount: response.context_count,
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'error',
        content: '获取回复失败，请重试',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = async () => {
    if (!inputValue.trim() || loading) return;

    const query = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await api.ragSearchAuthenticated(query, filters, token);

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.response,
          scholars: response.retrieved_scholars,
          contextCount: response.context_count,
        },
      ]);
    } catch (error) {
      console.error('Search error:', error);
      setMessages(prev => [...prev, {
        role: 'error',
        content: '搜索失败，请重试',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleUsePlaceholder = () => {
    setInputValue(placeholder);
  };

  const toggleMessagesExpanded = (index) => {
    const new_expanded = new Set(expandedMessages);
    if (new_expanded.has(index)) {
      new_expanded.delete(index);
    } else {
      new_expanded.add(index);
    }
    setExpandedMessages(new_expanded);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">人物信息助手</h1>
        <p className="text-gray-600">使用 AI 了解人物信息</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Sessions Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow h-full flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-bold text-lg mb-3">对话历史</h2>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSessionName.trim()) {
                      createNewSession(newSessionName.trim());
                    }
                  }}
                  placeholder="输入对话名称"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const sessionName = newSessionName.trim() || `新对话 ${sessions.length + 1}`;
                    createNewSession(sessionName);
                  }}
                  disabled={messages.length === 0}
                  className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  ➕ 新建对话
                </button>
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg transition ${
                    currentSessionId === session.id
                      ? 'bg-blue-100 border-l-4 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {editingSessionId === session.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingSessionName}
                      onChange={(e) => setEditingSessionName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          renameSession(session.id, editingSessionName);
                        } else if (e.key === 'Escape') {
                          setEditingSessionId(null);
                        }
                      }}
                      onBlur={() => renameSession(session.id, editingSessionName)}
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <>
                      <div
                        onClick={() => switchSession(session.id)}
                        onDoubleClick={() => {
                          setEditingSessionId(session.id);
                          setEditingSessionName(session.name);
                        }}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <p className="text-sm font-medium truncate text-gray-900">{session.name}</p>
                        <p className="text-xs text-gray-500">
                          {session.messages.length} 条消息
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="mt-2 w-full px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                      >
                        🗑️ 删除
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow flex flex-col h-[600px]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-gray-500 text-lg mb-4">开始对话来探索学者信息</p>
                    <button
                      onClick={handleUsePlaceholder}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                      💡 示例: {placeholder}
                    </button>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-md p-4 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : msg.role === 'error'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        components={{
                          p: ({node, ...props}) => <p className="mb-2" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
                          li: ({node, ...props}) => <li className="ml-2" {...props} />,
                          code: ({node, inline, ...props}) => 
                            inline ? 
                              <code className="bg-gray-200 px-1 rounded text-xs" {...props} /> :
                              <code className="block bg-gray-200 p-2 rounded text-xs overflow-x-auto" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-400 pl-2 italic" {...props} />,
                          a: ({node, ...props}) => <a className="text-blue-600 underline" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Show scholars if available */}
                    {msg.scholars && msg.scholars.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <button
                          onClick={() => toggleMessagesExpanded(idx)}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {expandedMessages.has(idx) ? '隐藏' : '显示'}相关学者
                        </button>

                        {expandedMessages.has(idx) && (
                          <div className="mt-2 space-y-2">
                            {msg.scholars.map((scholar, sidx) => (
                              <div 
                                key={sidx} 
                                onClick={() => window.open(`/scholars/${scholar.id}`, '_blank')}
                                className="text-sm bg-white/20 p-2 rounded cursor-pointer hover:bg-white/30 transition"
                              >
                                <div className="font-semibold text-blue-600">{scholar.name}</div>
                                <div className="text-xs opacity-90">
                                  研究领域: {scholar.field_of_research}
                                </div>
                                <div className="text-xs opacity-75">
                                  相似度: {(scholar.similarity_score * 100).toFixed(1)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-4 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="输入消息，按 Enter 发送"
                  disabled={loading}
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={loading || !inputValue.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition"
                >
                  {loading ? '加载中...' : '发送'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Sidebar */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-4 space-y-4">
            <h2 className="font-bold text-lg">过滤条件</h2>

            {/* Include Hidden */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.includeHidden}
                  onChange={(e) => setFilters(prev => ({ ...prev, includeHidden: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">包括全部学者</span>
              </label>
            </div>

            {/* Threshold Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                相似度阈值
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={(filters.threshold || 0) * 100}
                onChange={(e) => setFilters(prev => ({ ...prev, threshold: e.target.value / 100 }))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 mt-1">
                {((filters.threshold || 0) * 100).toFixed(0)}%
              </div>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => setFilters({ includeHidden: false, identities: [], tags: [], threshold: 0 })}
              className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
            >
              重置过滤
            </button>

            {/* Info */}
            <div className="text-xs text-gray-500 border-t pt-4">
              <p className="font-semibold mb-2">💡 提示</p>
              <ul className="space-y-1">
                <li>• 按 Enter 发送消息</li>
                <li>• 提高阈值以获得更相关的结果</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
