import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import ImageWithFallback from '../components/ImageWithFallback';

export default function Tags() {
  const [tagsWithScholars, setTagsWithScholars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTagsWithScholars();
  }, []);

  const loadTagsWithScholars = async () => {
    try {
      setLoading(true);
      setError(null);
      const tagsResponse = await api.getTags();
      setTagsWithScholars(tagsResponse.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTagColorStyle = (color) => {
    const defaultColor = '#8f000b';
    const hexColor = color ? `#${color}` : defaultColor;
    return {
      backgroundColor: `${hexColor}18`,
      color: hexColor,
      borderColor: `${hexColor}50`,
    };
  };

  const AVATAR_LIMIT = 3;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">标签列表</h2>
        <p className="mt-2 text-gray-600">按标签浏览人物</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={loadTagsWithScholars} />
      ) : tagsWithScholars.length === 0 ? (
        <EmptyState title="暂无标签数据" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tagsWithScholars.map((tag) => (
            <Link
              key={tag.id}
              to={`/tags/${tag.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Tag header */}
              <div
                className="px-5 py-4 border-b-2"
                style={getTagColorStyle(tag.color)}
              >
                <h3 className="text-lg font-bold mb-0.5 truncate">{tag.name}</h3>
                {tag.description && (
                  <p className="text-xs opacity-70 line-clamp-1">{tag.description}</p>
                )}
              </div>

              {/* Scholar avatars */}
              <div className="px-5 py-4">
                {tag.scholars && tag.scholars.length > 0 ? (
                  <div className="flex items-center gap-3">
                    {tag.scholars.slice(0, AVATAR_LIMIT).map((scholar) => (
                      <div key={scholar.id} className="flex flex-col items-center w-14" title={scholar.name}>
                        <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                          <ImageWithFallback
                            src={scholar.imageFilename ? `/uploads/images/${scholar.imageFilename}` : null}
                            alt={scholar.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs text-gray-500 mt-1 text-center w-full truncate">
                          {scholar.name}
                        </span>
                      </div>
                    ))}

                    {tag.scholars.length > AVATAR_LIMIT && (
                      <div className="flex flex-col items-center w-14">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shadow-sm">
                          <span className="text-sm font-semibold text-gray-500">
                            +{tag.scholars.length - AVATAR_LIMIT}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 mt-1">更多</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">暂无人物</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
