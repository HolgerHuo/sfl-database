import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { api } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import ImageWithFallback from '../components/ImageWithFallback';

export default function ScholarDetail() {
  const { id } = useParams();
  const [scholar, setScholar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadScholar();
  }, [id]);

  const loadScholar = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getScholar(id);
      setScholar(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorState message={error} onRetry={loadScholar} fullPage />
      </div>
    );
  }

  if (!scholar) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorState message="未找到该人物信息" fullPage />
      </div>
    );
  }

  const genderLabel =
    scholar.gender === 'M' ? '男' : scholar.gender === 'F' ? '女' : scholar.gender;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-blue-600 transition-colors">首页</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </svg>
        <Link to="/scholars" className="hover:text-blue-600 transition-colors">人物</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium truncate">{scholar.name}</span>
      </nav>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header card */}
        <div className="md:flex">
          <div className="w-full md:max-w-xs mx-auto md:mx-0 md:flex-shrink-0 md:w-64 lg:w-72">
            <div className="aspect-[3/4] overflow-hidden">
              <ImageWithFallback
                src={scholar.imageFilename ? `/uploads/images/${scholar.imageFilename}` : null}
                alt={scholar.name}
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>

          <div className="p-6 md:p-8 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{scholar.name}</h1>

            {scholar.tags && scholar.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {scholar.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/tags/${tag.id}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {scholar.yearOfBirth && (
                <div>
                  <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">出生年份</dt>
                  <dd className="text-gray-800 font-medium">{scholar.yearOfBirth}</dd>
                </div>
              )}
              {scholar.gender && (
                <div>
                  <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">性别</dt>
                  <dd className="text-gray-800 font-medium">{genderLabel}</dd>
                </div>
              )}
              {scholar.fieldOfResearch && (
                <div className="sm:col-span-2">
                  <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">研究领域</dt>
                  <dd className="text-gray-800 font-medium">{scholar.fieldOfResearch}</dd>
                </div>
              )}
              {scholar.identity && (
                <div>
                  <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">身份</dt>
                  <dd className="text-gray-800 font-medium">{scholar.identity.name}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Introduction */}
        {scholar.introduction && (
          <div className="px-6 md:px-8 py-6 border-t border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">简介</h2>
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown>{scholar.introduction}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Social Influence */}
        {scholar.socialInfluence && (
          <div className="px-6 md:px-8 py-6 border-t border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">社会影响</h2>
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown>{scholar.socialInfluence}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Related News */}
        {scholar.news && scholar.news.length > 0 && (
          <div className="px-6 md:px-8 py-6 border-t border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">相关新闻</h2>
            <div className="space-y-3">
              {scholar.news.map((newsItem) => (
                <a
                  key={newsItem.id}
                  href={newsItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                      {newsItem.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {newsItem.publishDate && (
                        <span>{new Date(newsItem.publishDate).toLocaleDateString('zh-CN')}</span>
                      )}
                      {newsItem.source && (
                        <>
                          <span>·</span>
                          <span>{newsItem.source}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
