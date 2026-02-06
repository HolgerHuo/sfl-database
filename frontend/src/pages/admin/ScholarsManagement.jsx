import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function ScholarsManagement() {
  const [scholars, setScholars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
    featured: '',
  });
  const token = localStorage.getItem('token');
  const pageSize = 20;

  useEffect(() => {
    loadScholars();
  }, [page]);

  async function loadScholars() {
    try {
      const params = { page, pageSize };
      if (filters.name) params.name = filters.name;
      if (filters.featured) params.featured = filters.featured === 'true';

      const response = await api.getAllScholars(params, token);
      setScholars(response.data || []);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load scholars:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`确定要删除人物"${name}"吗？此操作不可撤销。`)) return;
    try {
      await api.deleteScholar(id, token);
      alert('删除成功');
      setPage(1);
      loadScholars();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('删除失败: ' + error.message);
    }
  }

  async function handleToggleVisibility(id, currentVisible) {
    try {
      const scholar = scholars.find(s => s.id === id);
      await api.updateScholar(id, {
        name: scholar.name,
        gender: scholar.gender,
        fieldOfResearch: scholar.fieldOfResearch,
        yearOfBirth: scholar.yearOfBirth,
        image: scholar.image,
        introduction: scholar.introduction,
        socialInfluence: scholar.socialInfluence,
        identity: scholar.identity,
        featured: scholar.featured,
        visible: !currentVisible,
        tagIds: scholar.tags?.map(t => t.id) || [],
        version: scholar.version,
      }, token);
      loadScholars();
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
      alert('更新可见性失败: ' + error.message);
    }
  }

  function handleSearch() {
    setPage(1);
    loadScholars();
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
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">人物列表</h2>
        <Link
          to="/admin/scholars/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + 创建新人物
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="搜索姓名..."
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && loadScholars()}
            className="px-3 py-2 border rounded"
          />
          <select
            value={filters.featured}
            onChange={(e) => setFilters({ ...filters, featured: e.target.value })}
            className="px-3 py-2 border rounded"
          >
            <option value="">全部</option>
            <option value="true">推荐展示</option>
            <option value="false">非推荐</option>
          </select>
        </div>
        <div className="mt-4">
          <button
            onClick={handleSearch}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">研究领域</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">可见性</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scholars.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              scholars.map((scholar) => (
                <tr key={scholar.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {scholar.imageFilename ? (
                        <img
                          src={`/uploads/images/${scholar.imageFilename}`}
                          alt={scholar.name}
                          className="h-10 w-10 rounded-full object-cover mr-3"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{scholar.name}</div>
                        <div className="text-sm text-gray-500">
                          {scholar.gender === 'M' ? '男' : '女'} · {scholar.yearOfBirth}年
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {scholar.fieldOfResearch}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {scholar.featured && (
                      <span className="inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        推荐
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleVisibility(scholar.id, scholar.visible)}
                      className={`inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full ${
                        scholar.visible
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {scholar.visible ? '公开' : '隐藏'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/admin/scholars/${scholar.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      管理
                    </Link>
                    <Link
                      to={`/scholars/${scholar.id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                      target="_blank"
                    >
                      查看
                    </Link>
                    <button
                      onClick={() => handleDelete(scholar.id, scholar.name)}
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
