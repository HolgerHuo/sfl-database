import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function News() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  
  // Get page from URL or default to 1
  const page = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    loadNews();
  }, [page, searchParams]);

  const setPage = (newPage) => {
    setSearchParams({ page: newPage.toString() });
  };

  const loadNews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getNews({ page, page_size: 10 });
      
      // Fetch scholar details for each news item
      const newsWithScholars = await Promise.all(
        (response.data || []).map(async (newsItem) => {
          if (newsItem.scholarIds && newsItem.scholarIds.length > 0) {
            const scholars = await Promise.all(
              newsItem.scholarIds.map(async (scholarId) => {
                try {
                  const scholar = await api.getScholar(scholarId);
                  return {
                    id: scholar.id,
                    name: scholar.name,
                    imageFilename: scholar.imageFilename
                  };
                } catch (err) {
                  console.error(`Failed to fetch scholar ${scholarId}:`, err);
                  return null;
                }
              })
            );
            return { ...newsItem, scholars: scholars.filter(s => s !== null) };
          }
          return { ...newsItem, scholars: [] };
        })
      );
      
      setNews(newsWithScholars);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading && news.length === 0) {
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">新闻列表</h2>
        <p className="mt-2 text-gray-600">最新的人物相关新闻</p>
      </div>

      {news.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">暂无新闻数据</p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {news.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    {item.summary && (
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {item.summary}
                      </p>
                    )}
                    <div className="flex items-center text-sm text-gray-500 space-x-1 mb-3">
                      <span>{formatDate(item.publishedAt || item.createdAt)}</span>
                      {item.source && <span>来源: {item.source}</span>}
                    </div>
                    
                    {/* Related Scholars */}
                    {item.scholars && item.scholars.length > 0 && (
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-sm text-gray-500">相关人物:</span>
                        <div className="flex items-center gap-2">
                          {item.scholars.slice(0, 3).map((scholar) => (
                            <Link
                              key={scholar.id}
                              to={`/scholars/${scholar.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 bg-gray-50 rounded-full pl-1 pr-3 py-1 hover:bg-gray-200 transition-colors"
                            >
                              <img
                                src={`/uploads/images/${scholar.imageFilename}`}
                                alt={scholar.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                              <span className="text-sm text-gray-700">{scholar.name}</span>
                            </Link>
                          ))}
                          {item.scholars.length > 3 && (
                            <span className="text-sm text-gray-500">
                              +{item.scholars.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {item.image_url && (
                    <div className="ml-4 flex-shrink-0">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-32 h-24 object-cover rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>

          {pagination && (
            <div className="mt-8">
              <div className="flex justify-center items-center space-x-4">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  上一页
                </button>
                <span className="text-gray-700">
                  第 {pagination.page} 页 / 共 {pagination.totalPages} 页 (总计 {pagination.total} 项)
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
