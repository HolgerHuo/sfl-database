import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import ScholarCard from '../components/ScholarCard';

export default function Scholars() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [scholars, setScholars] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  
  // Get page from URL or default to 1
  const page = parseInt(searchParams.get('page') || '1', 10);
  
  // Filters
  const [selectedTags, setSelectedTags] = useState([]);
  const [gender, setGender] = useState('');
  const [sortBy, setSortBy] = useState('published_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Fixed page size for consistent pagination
  const pageSize = 12;

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    loadScholars();
  }, [page, selectedTags, gender, sortBy, sortOrder, searchParams]);

  const loadTags = async () => {
    try {
      const response = await api.getTags();
      setTags(response.data || []);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  const loadScholars = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        page_size: pageSize,
        sort: sortBy,
        order: sortOrder
      };
      
      if (selectedTags.length > 0) {
        params.tags = selectedTags;
      }
      
      if (gender) {
        params.gender = gender;
      }
      
      const response = await api.getScholars(params);
      setScholars(response.data || []);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setPage = (newPage) => {
    setSearchParams({ page: newPage.toString() });
  };

  const toggleTag = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setGender('');
    setSortBy('published_at');
    setSortOrder('desc');
    setPage(1);
  };

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
        <h2 className="text-3xl font-bold text-gray-900">全部人物</h2>
        <p className="mt-2 text-gray-600">浏览和筛选所有已发布的人物</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tags Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签筛选
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* Gender Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              性别
            </label>
            <select
              value={gender}
              onChange={(e) => { setGender(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              <option value="M">男</option>
              <option value="F">女</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              排序方式
            </label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="published_at">发布时间</option>
              <option value="name">姓名</option>
              <option value="year_of_birth">出生年份</option>
              <option value="updated_at">更新时间</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              排序顺序
            </label>
            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(selectedTags.length > 0 || gender || sortBy !== 'published_at' || sortOrder !== 'desc') && (
          <div className="mt-4">
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              清除所有筛选
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-xl text-gray-600">加载中...</div>
        </div>
      ) : scholars.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">未找到符合条件的人物</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {scholars.map((scholar) => (
              <ScholarCard key={scholar.id} scholar={scholar} />
            ))}
          </div>

          {/* Pagination */}
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
