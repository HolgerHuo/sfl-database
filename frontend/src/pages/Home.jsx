import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import ImageWithFallback from '../components/ImageWithFallback';

const CARD_W = 160; // w-40 = 10rem
const GAP = 16;     // gap-4 = 1rem

function ScholarScrollRow({ scholars }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    const snap = () => {
      const avail = parent.clientWidth;
      const n = Math.max(1, Math.floor((avail + GAP) / (CARD_W + GAP)));
      el.style.maxWidth = `${n * CARD_W + (n - 1) * GAP}px`;
    };

    snap();
    const ro = new ResizeObserver(snap);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [scholars]);

  return (
    <div className="overflow-x-auto scrollbar-hide mx-auto" ref={containerRef}>
      <div className="flex w-max flex-nowrap gap-4 pb-2">
        {scholars.map((scholar) => (
          <Link
            key={scholar.id}
            to={`/scholars/${scholar.id}`}
            className="block w-40 flex-shrink-0 group"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200 h-full">
              <div className="aspect-[3/4] overflow-hidden bg-gray-100">
                <ImageWithFallback
                  src={scholar.imageFilename ? `/uploads/images/${scholar.imageFilename}` : null}
                  alt={scholar.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3">
                <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {scholar.name}
                </h4>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [featuredTags, setFeaturedTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFeaturedTags();
  }, []);

  const getRandomScholars = (scholars, limit = 12) => {
    if (!Array.isArray(scholars) || scholars.length === 0) {
      return [];
    }

    const copied = [...scholars];
    for (let i = copied.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copied[i], copied[j]] = [copied[j], copied[i]];
    }
    return copied.slice(0, limit);
  };

  const loadFeaturedTags = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getTags({ featured: true });
      const tags = (response.data || []).map((tag) => ({
        ...tag,
        randomScholars: getRandomScholars(tag.scholars),
      }));
      setFeaturedTags(tags);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            人物数据库
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            浏览所有已发布的人物
          </p>
        </div>
      </div>

      {/* Featured Tags Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">精选标签</h2>
        </div>*/}

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorState message={error} onRetry={loadFeaturedTags} />
        ) : featuredTags.length === 0 ? (
          <EmptyState title="暂无精选标签" description="管理员尚未设置首页推荐标签" />
        ) : (
          <div className="space-y-10 mb-8">
            {featuredTags.map((tag) => (
              <div key={tag.id}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold text-gray-900">{tag.name}</h3>
                  <Link
                    to={`/tags/${tag.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    查看标签
                  </Link>
                </div>
                {tag.description && (
                  <p className="text-sm text-gray-500 mb-4">{tag.description}</p>
                )}

                {tag.randomScholars.length === 0 ? (
                  <div className="text-sm text-gray-400">该标签暂无人物</div>
                ) : (
                  <ScholarScrollRow scholars={tag.randomScholars} />
                )}
              </div>
            ))}
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

