import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function TagDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [scholars, setScholars] = useState([]);
  const [tagName, setTagName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  
  // Get page from URL or default to 1
  const page = parseInt(searchParams.get('page') || '1', 10);
  
  // Fixed page size for consistent API calls
  const pageSize = 24;

  const setPage = (newPage) => {
    setSearchParams({ page: newPage.toString() });
  };

  useEffect(() => {
    loadScholarsByTag();
  }, [id, page]);

  const loadScholarsByTag = async () => {
    try {
      setLoading(true);
      setError(null);
            const response = await api.getTag(id, { page, page_size: pageSize });
      setTagName(response.name);
      setScholars(response.scholars || []);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-red-600">错误: {error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link to="/tags" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← 返回标签列表
        </Link>
        <h2 className="text-3xl font-bold text-gray-900">标签: {tagName}</h2>
        <p className="mt-2 text-gray-600">该标签下的所有人物</p>
      </div>

      {scholars.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">该标签下暂无人物</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {scholars.map((scholar) => (
              <Link
                key={scholar.id}
                to={`/scholars/${scholar.id}`}
                className="block group"
              >
                <div className="aspect-square rounded-full overflow-hidden bg-gray-100 mb-3 ring-4 ring-transparent group-hover:ring-blue-500 transition-all duration-300">
                  <img
                    src={`/uploads/images/${scholar.imageFilename}`}
                    alt={scholar.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-center text-sm font-medium text-gray-900 group-hover:text-blue-600">
                  {scholar.name}
                </p>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center space-x-4">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                上一页
              </button>
              <span className="text-gray-700">
                第 {page} 页 / 共 {pagination.totalPages} 页
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
