import { API_BASE_URL } from './config';

// Helper function to build query string with proper array handling
function buildQueryString(params) {
  const parts = [];

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      // For arrays, join with commas (backend now supports comma-separated values)
      if (value.length > 0) {
        parts.push(`${encodeURIComponent(key)}=${value.map(v => encodeURIComponent(v)).join(',')}`);
      }
    } else if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }

  return parts.join('&');
}

// Global flag to prevent multiple concurrent refresh attempts
let isRefreshing = false;
let refreshPromise = null;

// Fetch wrapper with automatic token refresh on 401
async function fetchWithAuth(url, options = {}) {
  // First attempt with current token
  let response = await fetch(url, options);

  // If not 401, return as-is
  if (response.status !== 401) {
    return response;
  }

  // If already refreshing, wait for that refresh to complete
  if (isRefreshing && refreshPromise) {
    await refreshPromise;
    // Retry with new token
    return fetch(url, options);
  }

  // Start refresh process
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Call refresh endpoint
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });

      if (!refreshResponse.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await refreshResponse.json();

      // Store new access token
      localStorage.setItem('token', data.access_token);

      // Update Authorization header in original request if it exists
      if (options.headers && options.headers['Authorization']) {
        options.headers['Authorization'] = `Bearer ${data.access_token}`;
      }

      return data.access_token;
    } catch (error) {
      // Refresh failed, clear tokens and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  // Wait for refresh to complete
  await refreshPromise;

  // Retry original request with new token
  return fetch(url, options);
}

// API helper functions
export const api = {
  // Scholars - Public endpoints
  async getScholars(params = {}) {
    const queryString = buildQueryString(params);
    const url = `${API_BASE_URL}/scholars${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error('获取人物列表失败');
    return response.json();
  },

  async getScholar(id, token = null) {
    const headers = {};
    let url = `${API_BASE_URL}/scholars/${id}`;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      url = `${API_BASE_URL}/admin/scholars/${id}`;
    }

    const response = await fetchWithAuth(url, { headers });
    if (!response.ok) throw new Error('获取人物详情失败');
    return response.json();
  },

  // Tags - Public endpoints
  async getTags() {
    const response = await fetchWithAuth(`${API_BASE_URL}/tags`);
    if (!response.ok) throw new Error('获取标签列表失败');
    return response.json();
  },

  async getTag(id, params = {}) {
    const queryString = buildQueryString(params);
    const url = `${API_BASE_URL}/tags/${id}${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error('获取标签详情失败');
    return response.json();
  },

  // News - Public endpoints
  async getNews(params = {}) {
    const queryString = buildQueryString(params);
    const url = `${API_BASE_URL}/news${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error('获取新闻列表失败');
    return response.json();
  },

  async getNewsItem(id) {
    const response = await fetchWithAuth(`${API_BASE_URL}/news/${id}`);
    if (!response.ok) throw new Error('获取新闻详情失败');
    return response.json();
  },

  // Auth endpoints
  async login() {
    window.location.href = `${API_BASE_URL}/auth/login`;
  },

  async refresh(refreshToken) {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('刷新令牌失败');
    return response.json();
  },

  async logout(token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    if (!response.ok) throw new Error('登出失败');
    return response.json();
  },

  // Admin - Scholars
  async getAllScholars(params = {}, token) {
    const queryString = buildQueryString(params);
    const url = `${API_BASE_URL}/admin/scholars${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithAuth(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('获取所有人物列表失败');
    return response.json();
  },

  async createScholar(data, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/scholars`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('创建人物失败');
    return response.json();
  },

  async updateScholar(id, data, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/scholars/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('更新人物失败');
    return response.json();
  },

  async deleteScholar(id, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/scholars/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('删除人物失败');
  },

  async unlockScholar(id, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/scholars/${id}/unlock`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('解锁人物失败');
    return response.json();
  },

  async forceUnlockScholar(id, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/scholars/${id}/force-unlock`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('强制解锁人物失败');
    return response.json();
  },

  async getScholarHistory(id, params = {}, token) {
    const queryString = buildQueryString(params);
    const url = `${API_BASE_URL}/admin/scholars/${id}/history${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithAuth(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('获取人物历史失败');
    return response.json();
  },

  // Admin - News
  async getAllNews(params = {}, token) {
    const queryString = buildQueryString(params);
    const url = `${API_BASE_URL}/admin/news${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithAuth(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('获取新闻列表失败');
    return response.json();
  },

  async getNewsById(id, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/news/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('获取新闻详情失败');
    return response.json();
  },

  async createNews(data, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/news`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('创建新闻失败');
    return response.json();
  },

  async updateNews(id, data, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/news/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('更新新闻失败');
    return response.json();
  },

  async deleteNews(id, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/news/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('删除新闻失败');
    return;
  },

  // Admin - Tags
  async getAllTags(token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/tags`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('获取标签列表失败');
    return response.json();
  },

  async getAdminTag(id, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/tags/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('获取标签详情失败');
    return response.json();
  },

  async createTag(data, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/tags`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('创建标签失败');
    return response.json();
  },

  async updateTag(id, data, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/tags/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('更新标签失败');
    return response.json();
  },

  async deleteTag(id, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/tags/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('删除标签失败');
    return;
  },

  // Admin - Identities
  async getAllIdentities(token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/identities`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('获取身份列表失败');
    return response.json();
  },

  async getIdentities(token) {
    return this.getAllIdentities(token);
  },

  async getIdentity(id, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/identities/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('获取身份详情失败');
    return response.json();
  },

  async createIdentity(data, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/identities`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('创建身份失败');
    return response.json();
  },

  async updateIdentity(id, data, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/identities/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('更新身份失败');
    return response.json();
  },

  async deleteIdentity(id, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/identities/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('删除身份失败');
    return;
  },

  // Admin - Users
  async getAllUsers(params = {}, token) {
    const queryString = buildQueryString(params);
    const url = `${API_BASE_URL}/admin/users${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithAuth(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('获取用户列表失败');
    return response.json();
  },

  async getUsers(token) {
    return this.getAllUsers({}, token);
  },

  async getUser(id, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/users/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('获取用户详情失败');
    return response.json();
  },

  async updateUser(id, data, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/users/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('更新用户失败');
    return response.json();
  },

  async deleteUser(id, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('删除用户失败');
  },

  // Admin - Images
  async listImages(params = {}, token) {
    const queryString = buildQueryString(params);
    const url = `${API_BASE_URL}/admin/images${queryString ? `?${queryString}` : ''}`;
    const response = await fetchWithAuth(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('获取图片列表失败');
    return response.json();
  },

  async uploadImage(file, token) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchWithAuth(`${API_BASE_URL}/admin/images/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) throw new Error('上传图片失败');
    return response.json();
  },

  async getImage(id, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/images/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('获取图片失败');
    return response.blob();
  },

  async deleteImage(id, token) {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/images/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('删除图片失败');
    return;
  },
};
