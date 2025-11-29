import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

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
      
      // Load all tags
      const tagsResponse = await api.getTags();
      const tags = tagsResponse.data || [];
      
      // Load scholars for each tag (first 6 scholars per tag)
      const tagsWithScholarsData = await Promise.all(
        tags.map(async (tag) => {
          try {
            const scholarsResponse = await api.getScholars({ 
              tags: [tag.id], 
              page_size: 6 
            });
            return {
              ...tag,
              scholars: scholarsResponse.data || []
            };
          } catch (err) {
            return {
              ...tag,
              scholars: []
            };
          }
        })
      );
      
      setTagsWithScholars(tagsWithScholarsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTagColorStyle = (color) => {
    // Default blue color
    const defaultColor = '#3B82F6';
    const hexColor = color ? `#${color}` : defaultColor;
    
    return {
      backgroundColor: `${hexColor}20`, // 20 = 12.5% opacity in hex
      color: hexColor,
      borderColor: `${hexColor}60` // 60 = 37.5% opacity in hex
    };
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
        <h2 className="text-3xl font-bold text-gray-900">标签列表</h2>
        <p className="mt-2 text-gray-600">按标签浏览人物</p>
      </div>

      {tagsWithScholars.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">暂无标签数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tagsWithScholars.map((tag) => (
            <Link
              key={tag.id}
              to={`/tags/${tag.id}`}
              className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
            >
              <div 
                className="p-6 border-b-4"
                style={getTagColorStyle(tag.color)}
              >
                <h3 className="text-2xl font-bold mb-2">
                  {tag.name}
                </h3>
                {tag.description && (
                  <p className="text-sm opacity-80">{tag.description}</p>
                )}
              </div>
              
              {tag.scholars && tag.scholars.length > 0 && (
                <div className="p-6">
                  <div className="flex gap-3 justify-center overflow-x-auto">
                    {/* First 2 scholars - always visible */}
                    {tag.scholars.slice(0, 2).map((scholar) => (
                      <div
                        key={scholar.id}
                        className="flex flex-col items-center w-16 flex-shrink-0"
                        title={scholar.name}
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 ring-2 ring-white shadow-md">
                          <img
                            src={`/uploads/images/${scholar.imageFilename}`}
                            alt={scholar.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs text-gray-600 mt-1 text-center w-full truncate">
                          {scholar.name}
                        </span>
                      </div>
                    ))}
                    
                    {/* Third scholar - hidden on mobile, visible on md+ */}
                    {tag.scholars.length > 2 && (
                      <div
                        className="hidden md:flex flex-col items-center w-16 flex-shrink-0"
                        title={tag.scholars[2].name}
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 ring-2 ring-white shadow-md">
                          <img
                            src={`/uploads/images/${tag.scholars[2].imageFilename}`}
                            alt={tag.scholars[2].name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs text-gray-600 mt-1 text-center w-full truncate">
                          {tag.scholars[2].name}
                        </span>
                      </div>
                    )}
                    
                    {/* +N circle - show if more than 2 on mobile, more than 3 on md+ */}
                    {tag.scholars.length > 2 && (
                      <div 
                        className="flex flex-col items-center w-16 flex-shrink-0" 
                        title={`还有 ${tag.scholars.length - 2} 位人物`}
                      >
                        <div className="w-16 h-16 rounded-full bg-gray-200 ring-2 ring-white shadow-md flex items-center justify-center md:hidden">
                          <span className="text-base font-semibold text-gray-600">
                            +{tag.scholars.length - 2}
                          </span>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-gray-200 ring-2 ring-white shadow-md hidden md:flex items-center justify-center">
                          <span className="text-base font-semibold text-gray-600">
                            +{tag.scholars.length - 3}
                          </span>
                        </div>
                        <span className="text-xs text-gray-600 mt-1 text-center w-full">
                          更多
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {(!tag.scholars || tag.scholars.length === 0) && (
                <div className="p-6 text-center text-gray-400">
                  暂无人物
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
