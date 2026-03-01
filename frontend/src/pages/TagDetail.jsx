import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import ImageWithFallback from '../components/ImageWithFallback';

export default function TagDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [scholars, setScholars] = useState([]);
  const [tagName, setTagName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  
  const page = parseInt(searchParams.get('page') || '1', 10);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/tags" className="hover:text-blue-600 transition-colors">标签</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">{tagName || '...'}</span>
      </nav>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{tagName}</h2>
        <p className="mt-1 text-gray-500 text-sm">该标签下的所有人物</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={loadScholarsByTag} />
      ) : scholars.length === 0 ? (
        <EmptyState title="该标签下暂无人物" />
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {scholars.map((scholar) => (
              <Link
                key={scholar.id}
                to={`/scholars/${scholar.id}`}
                className="block group text-center"
              >
                <div className="aspect-square rounded-full overflow-hidden bg-gray-100 mb-2 ring-2 ring-transparent group-hover:ring-blue-400 transition-all duration-200">
                  <ImageWithFallback
                    src={scholar.imageFilename ? `/uploads/images/${scholar.imageFilename}` : null}
                    alt={scholar.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs font-medium text-gray-700 group-hover:text-blue-600 transition-colors truncate">
                  {scholar.name}
                </p>
              </Link>
            ))}
          </div>

          <Pagination pagination={pagination} page={page} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
