import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [scholarsData, tagsData, newsData] = await Promise.all([
        api.getAllScholars({}, token),
        api.getAllTags(token),
        api.getAllNews({}, token)
      ]);

      setStats({
        scholars: scholarsData.pagination?.total || scholarsData.data?.length || 0,
        tags: tagsData.data?.length || 0,
        news: newsData.pagination?.total || newsData.data?.length || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats({
        scholars: 0,
        tags: 0,
        news: 0
      });
    } finally {
      setLoading(false);
    }
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link to="/admin/scholars" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">人物</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.scholars || 0}</p>
            </div>
            <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </Link>

        <Link to="/admin/tags" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">标签</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.tags || 0}</p>
            </div>
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
        </Link>

        <Link to="/admin/news" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">新闻</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.news || 0}</p>
            </div>
            <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">快速操作</h3>
        <div className="space-y-2">
          <Link to="/admin/scholars/new" className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded">
            + 创建新人物
          </Link>
          <Link to="/admin/news/new" className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded">
            + 创建新闻
          </Link>
          <Link to="/admin/tags/new" className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded">
            + 创建标签
          </Link>
        </div>
      </div>
    </div>
  );
}
