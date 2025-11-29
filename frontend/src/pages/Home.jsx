import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ScholarCard from '../components/ScholarCard';
import { useResponsivePagination } from '../hooks/useResponsivePagination';

export default function Home() {
  const [featuredScholars, setFeaturedScholars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Responsive pagination for featured scholars
  const { pageSize } = useResponsivePagination({
    itemHeight: 400,
    minItemsPerPage: 4,
    maxItemsPerPage: 16
  });

  useEffect(() => {
    loadFeaturedScholars();
  }, [pageSize]);

  const loadFeaturedScholars = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getScholars({ featured: true, page_size: 10000000000000 });
      setFeaturedScholars(response.data || []);
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            人物数据库
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            浏览所有已发布的人物
          </p>
        </div>
      </div>

      {/* Featured Scholars Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">精选人物</h2>
        </div>

        {featuredScholars.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">暂无精选人物</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide mb-8">
            <div className="flex gap-6 pb-4">
              {featuredScholars.map((scholar) => (
                <Link 
                  key={scholar.id} 
                  to={`/scholars/${scholar.id}`} 
                  className="flex-shrink-0 w-56 block"
                >
                  <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full">
                    <div className="aspect-[3/4] overflow-hidden bg-gray-100">
                      <img
                        src={`/uploads/images/${scholar.imageFilename}`}
                        alt={scholar.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{scholar.name}</h3>
                      {scholar.tags && scholar.tags.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                          {scholar.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap flex-shrink-0"
                            >
                              {tag.name}
                            </span>
                          ))}
                          {scholar.tags.length > 2 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap flex-shrink-0">
                              +{scholar.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Browse All Button */}
        <div className="text-center mt-12">
          <Link
            to="/scholars"
            className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          >
            浏览全部
            <svg
              className="ml-2 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
