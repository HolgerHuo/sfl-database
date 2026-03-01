import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';

export default function News() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  
  // Get page from URL or default to 1
  const page = parseInt(searchParams.get('page') || '1', 10);
  const previousPageRef = useRef(page);

  useEffect(() => {
    loadNews();
  }, [page, searchParams]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (previousPageRef.current !== page) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      previousPageRef.current = page;
    }
  }, [page, loading]);

  const setPage = (newPage) => {
    setSearchParams({ page: newPage.toString() });
  };

  const loadNews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getNews({ page, page_size: 10 });
      setNews(response.data || []);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">新闻列表</h2>
        <p className="mt-2 text-gray-600">最新的人物相关新闻</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={loadNews} />
      ) : news.length === 0 ? (
        <EmptyState title="暂无新闻数据" description="目前还没有相关新闻" />
      ) : (
        <>
          <div className="space-y-4">
            {news.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Thumbnail */}
                {item.image_url && (
                  <div className="flex-shrink-0 hidden sm:block">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-28 h-20 object-cover rounded-lg"
                      onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 mb-1.5 line-clamp-2 hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>

                  {item.summary && (
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.summary}</p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                    <span>{formatDate(item.publishDate || item.createdAt)}</span>
                    {item.source && (
                      <>
                        <span>·</span>
                        <span>{item.source}</span>
                      </>
                    )}
                  </div>

                  {/* Related Scholars */}
                  {item.scholars && item.scholars.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="text-xs text-gray-400">相关人物:</span>
                      {item.scholars.slice(0, 4).map((scholar) => (
                        <Link
                          key={scholar.id}
                          to={`/scholars/${scholar.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full pl-0.5 pr-2.5 py-0.5 hover:bg-gray-100 transition-colors"
                        >
                          <img
                            src={`/uploads/images/${scholar.imageFilename}`}
                            alt={scholar.name}
                            className="w-5 h-5 rounded-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <span className="text-xs text-gray-600">{scholar.name}</span>
                        </Link>
                      ))}
                      {item.scholars.length > 4 && (
                        <span className="text-xs text-gray-400">+{item.scholars.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* External link icon */}
                <div className="flex-shrink-0 self-start mt-0.5">
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            ))}
          </div>

          <Pagination pagination={pagination} page={page} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
