import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ pending: 0 });
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch (e) {
        console.error('Failed to decode token', e);
      }
    }
    loadStats();
  }, [token]);

  async function loadStats() {
    try {
      const result = await api.getPendingChanges({ status: 'pending' }, token);
      setStats({ pending: result.pagination?.total || result.data.length });
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  }

  const canReview = user && (user.role === 'admin' || user.role === 'moderator');
  const canManageUsers = user && user.role === 'admin';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">管理后台</h1>
        {user && (
          <p className="text-gray-600">
            欢迎, {user.email} ({user.role === 'admin' ? '管理员' : user.role === 'moderator' ? '审核员' : '编辑'})
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/admin/pending-changes" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <h3 className="text-xl font-semibold mb-2">待审核管理</h3>
          <p className="text-gray-600 mb-4">查看和处理待审核的变更请求</p>
          {stats.pending > 0 && (
            <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
              {stats.pending} 条待处理
            </span>
          )}
        </Link>

        {canManageUsers && (
          <Link to="/admin/users" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">用户管理</h3>
            <p className="text-gray-600">管理用户角色和权限</p>
          </Link>
        )}

        <Link to="/admin/scholars" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <h3 className="text-xl font-semibold mb-2">人物管理</h3>
          <p className="text-gray-600">
            {canReview ? '直接编辑人物信息' : '提交人物变更请求'}
          </p>
        </Link>

        <Link to="/admin/news" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <h3 className="text-xl font-semibold mb-2">新闻管理</h3>
          <p className="text-gray-600">
            {canReview ? '直接管理新闻' : '提交新闻变更请求'}
          </p>
        </Link>

        <Link to="/admin/tags" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <h3 className="text-xl font-semibold mb-2">标签管理</h3>
          <p className="text-gray-600">
            {canReview ? '直接管理标签' : '提交标签变更请求'}
          </p>
        </Link>

        <Link to="/admin/identities" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <h3 className="text-xl font-semibold mb-2">身份管理</h3>
          <p className="text-gray-600">
            {canReview ? '直接管理身份分类' : '提交身份变更请求'}
          </p>
        </Link>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">角色说明</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li><strong>编辑 (Editor):</strong> 可以提交变更请求，需要审核员或管理员审批后才能生效</li>
          <li><strong>审核员 (Moderator):</strong> 可以审批编辑的请求，也可以直接编辑内容</li>
          <li><strong>管理员 (Admin):</strong> 拥有所有权限，包括管理用户角色</li>
        </ul>
      </div>
    </div>
  );
}
