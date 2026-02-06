import { useState, useEffect } from 'react';
import { api } from '../../api';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({
    role: '',
    active: '',
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const token = localStorage.getItem('token');
  const pageSize = 20;

  useEffect(() => {
    // Decode token to get current user info
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload);
      } catch (e) {
        console.error('Failed to decode token', e);
      }
    }
    loadUsers();
  }, [page]);

  async function loadUsers() {
    try {
      const params = { page, pageSize };
      if (filters.role) params.role = filters.role;
      if (filters.active) params.active = filters.active === 'true';

      const response = await api.getAllUsers(params, token);
      setUsers(response.data || []);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('加载用户失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateUser(userId, updates) {
    try {
      await api.updateUser(userId, updates, token);
      alert('更新成功');
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('更新失败: ' + error.message);
    }
  }

  async function handleToggleActivation(user) {
    // Prevent self-deactivation
    if (currentUser && user.id === currentUser.user_id && user.active) {
      alert('不能停用自己的账户');
      return;
    }

    const action = user.active ? '停用' : '激活';
    const confirmation = confirm(`确定要${action}用户 "${user.email}" 吗？`);

    if (!confirmation) return;

    await handleUpdateUser(user.id, { active: !user.active });
  }

  async function handleDeleteUser(userId, email) {
    if (!confirm(`确定要删除用户 "${email}" 吗？此操作不可撤销。`)) return;
    try {
      await api.deleteUser(userId, token);
      alert('删除成功');
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('删除失败: ' + error.message);
    }
  }

  function getRoleDisplay(role) {
    const roleMap = {
      admin: '管理员',
      moderator: '审核员',
      editor: '编辑',
    };
    return roleMap[role] || role;
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">用户管理</h2>
      </div>

      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            className="px-3 py-2 border rounded"
          >
            <option value="">全部角色</option>
            <option value="admin">管理员</option>
            <option value="moderator">审核员</option>
            <option value="editor">编辑</option>
          </select>
          <select
            value={filters.active}
            onChange={(e) => setFilters({ ...filters, active: e.target.value })}
            className="px-3 py-2 border rounded"
          >
            <option value="">全部状态</option>
            <option value="true">激活</option>
            <option value="false">未激活</option>
          </select>
        </div>
        <div className="mt-4">
          <button
            onClick={() => { setPage(1); loadUsers(); }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            搜索
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最后登录</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateUser(user.id, { role: e.target.value })}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="admin">管理员</option>
                      <option value="moderator">审核员</option>
                      <option value="editor">编辑</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActivation(user)}
                      disabled={currentUser && user.id === currentUser.user_id && user.active}
                      className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded border-2 transition-colors ${
                        user.active
                          ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100 hover:border-green-400'
                          : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                      } ${currentUser && user.id === currentUser.user_id && user.active ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {user.active ? '✓ 已激活' : '✕ 未激活'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.lastLogin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="px-4 py-2">
            第 {page} / {pagination.totalPages} 页
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
