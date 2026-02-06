import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function NewsManagement() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const token = localStorage.getItem('token');
  const pageSize = 20;

  useEffect(() => {
    loadNews();
  }, [page]);

  async function loadNews() {
    try {
      const response = await api.getAllNews({ page, pageSize }, token);
      setNewsList(response.data || []);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load news:', error);
      alert('加载新闻失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, title) {
    if (!confirm(`确定要删除新闻"${title}"吗？`)) return;
    try {
      await api.deleteNews(id, token);
      alert('删除成功');
      loadNews();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('删除失败: ' + error.message);
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('zh-CN');
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
        <h2 className="text-2xl font-bold">新闻管理</h2>
        <Link
          to="/admin/news/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + 创建新闻
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">来源</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">发布日期</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">相关人物</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {newsList.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              newsList.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 max-w-md">
                      {item.title}
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate block max-w-md"
                    >
                      {item.url}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.source}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(item.publishDate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.scholars?.length || 0} 人
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/admin/news/${item.id}/edit`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      编辑
                    </Link>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
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
