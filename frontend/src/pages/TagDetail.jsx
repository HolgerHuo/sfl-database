import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useResponsivePagination } from '../hooks/useResponsivePagination';

export default function TagDetail() {
  const { id } = useParams();
  const [scholars, setScholars] = useState([]);
  const [tagName, setTagName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  
  // Responsive pagination - TagDetail uses 6 columns on large screens
  const { pageSize } = useResponsivePagination({
    itemHeight: 200, // Smaller items in TagDetail (circular avatars)
    minItemsPerPage: 6,
    maxItemsPerPage: 60
  });

  useEffect(() => {
    loadScholarsByTag();
  }, [id, page, pageSize]);

  const loadScholarsByTag = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First get all tags to find the tag name
      const tagsResponse = await api.getTags();
      const tag = tagsResponse.data.find(t => t.id === id);
      if (tag) {
        setTagName(tag.name);
      }
      
      // Then get scholars filtered by this tag with pagination
      const response = await api.getScholars({ 
        tags: [id], 
        page,
        page_size: pageSize
      });
      setScholars(response.data || []);
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
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-8 flex justify-center items-center space-x-4">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                上一页
              </button>
              <span className="text-gray-700">
                第 {page} 页 / 共 {pagination.total_pages} 页
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.total_pages}
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
