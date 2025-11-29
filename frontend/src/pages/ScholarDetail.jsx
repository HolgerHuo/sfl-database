import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { api } from '../api';

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

  if (!scholar) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">未找到人物信息</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/" className="text-blue-600 hover:text-blue-800 mb-6 inline-block">
        ← 返回首页
      </Link>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:flex-shrink-0 w-full md:w-64 aspect-[3/4]">
            <img
              src={`/uploads/images/${scholar.imageFilename}`}
              alt={scholar.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{scholar.name}</h1>
            
            {scholar.tags && scholar.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {scholar.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/tags/${tag.id}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="space-y-3 text-gray-700">
              {scholar.yearOfBirth && (
                <p>
                  <span className="font-semibold">出生年份:</span> {scholar.yearOfBirth}
                </p>
              )}
              {scholar.fieldOfResearch && (
                <p>
                  <span className="font-semibold">研究领域:</span> {scholar.fieldOfResearch}
                </p>
              )}
              {scholar.gender && (
                <p>
                  <span className="font-semibold">性别:</span>{' '}
                  {scholar.gender === 'M' ? '男' : scholar.gender === 'F' ? '女' : scholar.gender}
                </p>
              )}
              {scholar.identity && (
                <p>
                  <span className="font-semibold">身份:</span> {scholar.identity.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {scholar.introduction && (
          <div className="px-8 py-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">简介</h2>
            <div className="text-gray-700 prose prose-sm max-w-none">
              <ReactMarkdown>{scholar.introduction}</ReactMarkdown>
            </div>
          </div>
        )}

        {scholar.socialInfluence && (
          <div className="px-8 py-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">社会影响</h2>
            <div className="text-gray-700 prose prose-sm max-w-none">
              <ReactMarkdown>{scholar.socialInfluence}</ReactMarkdown>
            </div>
          </div>
        )}

        {scholar.news && scholar.news.length > 0 && (
          <div className="px-8 py-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">相关新闻</h2>
            <div className="space-y-4">
              {scholar.news.map((newsItem) => (
                <Link
                  key={newsItem.id}
                  to={`/news/${newsItem.id}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {newsItem.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {newsItem.publishDate && (
                      <span>
                        发布时间: {new Date(newsItem.publishDate).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                    {newsItem.source && (
                      <span>
                        来源: {newsItem.source}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
