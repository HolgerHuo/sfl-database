import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import ScholarCard from '../components/ScholarCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';

function parseCsvParam(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function Scholars() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [scholars, setScholars] = useState([]);
  const [tags, setTags] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const tagDropdownRef = useRef(null);
  
  // Get page from URL or default to 1
  const page = parseInt(searchParams.get('page') || '1', 10);
  const previousPageRef = useRef(page);
  
  // Filters
  const [selectedTags, setSelectedTags] = useState(() => parseCsvParam(searchParams.get('tags')));
  const [selectedIdentity, setSelectedIdentity] = useState(() => searchParams.get('identity') || '');
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [appliedSearch, setAppliedSearch] = useState(() => searchParams.get('search') || '');
  const [gender, setGender] = useState(() => searchParams.get('gender') || '');
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || 'published_at');
  const [sortOrder, setSortOrder] = useState(() => searchParams.get('order') || 'desc');

  // Fixed page size for consistent pagination
  const pageSize = 24;

  const filteredTags = useMemo(() => {
    const keyword = tagSearchTerm.trim().toLowerCase();
    if (!keyword) {
      return tags;
    }

    return tags.filter((tag) => tag.name.toLowerCase().includes(keyword));
  }, [tags, tagSearchTerm]);

  useEffect(() => {
    loadTags();
    loadIdentities();
  }, []);

  useEffect(() => {
    loadScholars();
  }, [page, selectedTags, selectedIdentity, appliedSearch, gender, sortBy, sortOrder]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (previousPageRef.current !== page) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      previousPageRef.current = page;
    }
  }, [page, loading]);

  useEffect(() => {
    const urlTags = parseCsvParam(searchParams.get('tags'));
    const urlIdentity = searchParams.get('identity') || '';
    const urlSearch = searchParams.get('search') || '';
    const urlGender = searchParams.get('gender') || '';
    const urlSort = searchParams.get('sort') || 'published_at';
    const urlOrder = searchParams.get('order') || 'desc';

    setSelectedTags(urlTags);
    setSelectedIdentity(urlIdentity);
    setAppliedSearch(urlSearch);
    setSearchInput(urlSearch);
    setGender(urlGender);
    setSortBy(urlSort);
    setSortOrder(urlOrder);
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target)) {
        setIsTagDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const nextSearch = searchInput.trim();

    if (nextSearch === appliedSearch) {
      return;
    }

    const timer = setTimeout(() => {
      setAppliedSearch(nextSearch);
      updateUrlParams({ pageValue: 1, searchValue: nextSearch });
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput, appliedSearch]);

  const loadTags = async () => {
    try {
      const response = await api.getTags();
      setTags(response.data || []);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  const loadIdentities = async () => {
    try {
      const response = await api.getPublicIdentities();
      setIdentities(response.data || []);
    } catch (err) {
      console.error('Failed to load identities:', err);
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

      if (selectedIdentity) {
        params.identities = [selectedIdentity];
      }

      if (appliedSearch) {
        params.search = appliedSearch;
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

  const updateUrlParams = ({
    pageValue = page,
    tagsValue = selectedTags,
    identityValue = selectedIdentity,
    searchValue = appliedSearch,
    genderValue = gender,
    sortValue = sortBy,
    orderValue = sortOrder,
  } = {}) => {
    const params = new URLSearchParams();

    params.set('page', pageValue.toString());

    if (tagsValue.length > 0) {
      params.set('tags', tagsValue.join(','));
    }
    if (identityValue) {
      params.set('identity', identityValue);
    }
    if (searchValue) {
      params.set('search', searchValue);
    }
    if (genderValue) {
      params.set('gender', genderValue);
    }
    if (sortValue !== 'published_at') {
      params.set('sort', sortValue);
    }
    if (orderValue !== 'desc') {
      params.set('order', orderValue);
    }

    setSearchParams(params);
  };

  const setPage = (newPage) => {
    updateUrlParams({ pageValue: newPage });
  };

  const toggleTag = (tagId) => {
    setSelectedTags((prev) => {
      const nextTags = prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId];

      updateUrlParams({ pageValue: 1, tagsValue: nextTags });
      return nextTags;
    });
  };

  const handleSearch = () => {
    const nextSearch = searchInput.trim();
    setAppliedSearch(nextSearch);
    updateUrlParams({ pageValue: 1, searchValue: nextSearch });
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedIdentity('');
    setSearchInput('');
    setAppliedSearch('');
    setTagSearchTerm('');
    setIsTagDropdownOpen(false);
    setGender('');
    setSortBy('published_at');
    setSortOrder('desc');
    setSearchParams({ page: '1' });
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorState message={error} onRetry={loadScholars} fullPage />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">全部人物</h2>
        <p className="mt-2 text-gray-600">浏览和筛选所有已发布的人物</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            关键词搜索
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              placeholder="搜索姓名、领域、简介、标签、身份..."
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="shrink-0 flex items-center gap-1.5 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <span className="hidden md:inline">搜索</span>
            </button>
            <button
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="md:hidden shrink-0 relative flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              {(selectedTags.length > 0 || selectedIdentity || gender || sortBy !== 'published_at' || sortOrder !== 'desc') && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-600 text-white text-xs">
                  {[selectedTags.length > 0, !!selectedIdentity, !!gender, sortBy !== 'published_at', sortOrder !== 'desc'].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className={`grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mt-2 ${
          isFilterOpen ? 'grid' : 'hidden md:grid'
        }`}>
          <div className="relative" ref={tagDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签筛选
            </label>
            <button
              onClick={() => setIsTagDropdownOpen((prev) => !prev)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {selectedTags.length > 0 ? `已选 ${selectedTags.length} 个标签` : '选择标签'}
            </button>

            {isTagDropdownOpen && (
              <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-md shadow-lg p-3">
                <input
                  type="text"
                  value={tagSearchTerm}
                  onChange={(e) => setTagSearchTerm(e.target.value)}
                  placeholder="搜索标签..."
                  className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="max-h-56 overflow-y-auto space-y-2">
                  {filteredTags.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2">未找到匹配标签</div>
                  ) : (
                    filteredTags.map((tag) => (
                      <label key={tag.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag.id)}
                          onChange={() => toggleTag(tag.id)}
                          className="h-4 w-4"
                        />
                        <span>{tag.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTags
                  .map((tagId) => tags.find((tag) => tag.id === tagId))
                  .filter(Boolean)
                  .map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                    >
                      {tag.name}
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Identity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              身份
            </label>
            <select
              value={selectedIdentity}
              onChange={(e) => {
                const nextIdentity = e.target.value;
                setSelectedIdentity(nextIdentity);
                updateUrlParams({ pageValue: 1, identityValue: nextIdentity });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              {identities.map((identity) => (
                <option key={identity.id} value={identity.id}>
                  {identity.name}
                </option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              性别
            </label>
            <select
              value={gender}
              onChange={(e) => {
                const nextGender = e.target.value;
                setGender(nextGender);
                updateUrlParams({ pageValue: 1, genderValue: nextGender });
              }}
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
              onChange={(e) => {
                const nextSort = e.target.value;
                setSortBy(nextSort);
                updateUrlParams({ pageValue: 1, sortValue: nextSort });
              }}
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
              onChange={(e) => {
                const nextOrder = e.target.value;
                setSortOrder(nextOrder);
                updateUrlParams({ pageValue: 1, orderValue: nextOrder });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(selectedTags.length > 0 || selectedIdentity || appliedSearch || gender || sortBy !== 'published_at' || sortOrder !== 'desc') && (
          <div className="mt-4">
            <button
              onClick={() => { clearFilters(); setIsFilterOpen(false); }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              清除所有筛选
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : scholars.length === 0 ? (
        <EmptyState
          title="未找到符合条件的人物"
          description="请尝试调整筛选条件或关键词搜索"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {scholars.map((scholar) => (
              <ScholarCard key={scholar.id} scholar={scholar} />
            ))}
          </div>

          <Pagination pagination={pagination} page={page} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
