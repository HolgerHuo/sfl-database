import { Link } from 'react-router-dom';

export default function ScholarCard({ scholar }) {
  const profileImage = scholar.imageFilename;
  
  return (
    <Link to={`/scholars/${scholar.id}`} className="block">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div className="aspect-square overflow-hidden bg-gray-100">
          <img
            src={`/uploads/images/${profileImage}`}
            alt={scholar.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{scholar.name}</h3>
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
  );
}
