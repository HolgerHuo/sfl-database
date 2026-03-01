import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ImageWithFallback from './ImageWithFallback';

export default function ScholarCard({ scholar }) {
  const cardRef = useRef(null);
  const [cardWidth, setCardWidth] = useState(0);

  useEffect(() => {
    if (!cardRef.current) return;

    const updateWidth = () => {
      if (cardRef.current) {
        setCardWidth(cardRef.current.getBoundingClientRect().width);
      }
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(cardRef.current);

    return () => observer.disconnect();
  }, []);

  const tagDisplayMode = cardWidth < 140 ? 'count' : cardWidth < 190 ? 'one' : 'two';

  return (
    <Link to={`/scholars/${scholar.id}`} className="block group">
      <div
        ref={cardRef}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200"
      >
        {/* Portrait thumbnail */}
        <div className="aspect-[3/4] overflow-hidden bg-gray-100">
          <ImageWithFallback
            src={scholar.imageFilename ? `/uploads/images/${scholar.imageFilename}` : null}
            alt={scholar.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div className="p-3.5">
          <h3 className="text-sm font-semibold text-gray-900 truncate mb-1.5 group-hover:text-blue-600 transition-colors">
            {scholar.name}
          </h3>

          {scholar.identity && (
            <p className="text-xs text-gray-500 mb-2 truncate">{scholar.identity.name}</p>
          )}

          {scholar.tags && scholar.tags.length > 0 && (
            <div className="flex gap-1.5">
              {tagDisplayMode === 'count' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 whitespace-nowrap">
                  +{scholar.tags.length}
                </span>
              )}

              {tagDisplayMode === 'one' && (
                <>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 whitespace-nowrap">
                    {scholar.tags[0].name}
                  </span>
                  {scholar.tags.length > 1 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 whitespace-nowrap">
                      +{scholar.tags.length - 1}
                    </span>
                  )}
                </>
              )}

              {tagDisplayMode === 'two' && (
                <>
                  {scholar.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 whitespace-nowrap"
                    >
                      {tag.name}
                    </span>
                  ))}
                  {scholar.tags.length > 2 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 whitespace-nowrap">
                      +{scholar.tags.length - 2}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
