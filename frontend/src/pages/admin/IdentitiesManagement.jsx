import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function IdentitiesManagement() {
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadIdentities();
  }, []);

  async function loadIdentities() {
    try {
      const response = await api.getAllIdentities(token);
      setIdentities(response.data || []);
    } catch (error) {
      console.error('Failed to load identities:', error);
      alert('加载身份失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`确定要删除身份"${name}"吗？\n\n注意：如果有人物使用此身份，删除操作将失败。`)) return;
    try {
      await api.deleteIdentity(id, token);
      alert('删除成功');
      loadIdentities();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('删除失败: ' + error.message);
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
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">身份管理</h2>
        <Link
          to="/admin/identities/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + 创建新身份
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">排序</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {identities.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              identities.map((identity) => (
                <tr key={identity.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{identity.name}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-md truncate">
                      {identity.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {identity.displayOrder}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/admin/identities/${identity.id}/edit`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      编辑
                    </Link>
                    <button
                      onClick={() => handleDelete(identity.id, identity.name)}
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
    </div>
  );
}
