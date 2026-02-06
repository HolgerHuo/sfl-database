import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { api } from '../../api';

export default function ScholarDetailAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scholar, setScholar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [allNews, setAllNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [showCreateNewsModal, setShowCreateNewsModal] = useState(false);
  const [newNewsForm, setNewNewsForm] = useState({
    title: '',
    source: '',
    url: '',
    publishDate: new Date().toISOString().split('T')[0],
  });
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadScholar();
  }, [id]);

  const loadScholar = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getScholar(id, token);
      setScholar(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('只能上传图片文件');
      return;
    }

    try {
      setImageUploadLoading(true);
      const result = await api.uploadImage(file, token);

      // Update scholar with new image
      await api.updateScholar(id, {
        ...scholar,
        image: result.id,
        tagIds: scholar.tags.map(t => t.id),
        fieldOfResearch: scholar.fieldOfResearch,
        yearOfBirth: scholar.yearOfBirth,
        socialInfluence: scholar.socialInfluence,
        identity: scholar.identity.id,
        visible: scholar.visible !== undefined ? scholar.visible : true,
      }, token);

      alert('图片上传成功');
      loadScholar();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('上传失败: ' + error.message);
    } finally {
      setImageUploadLoading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!confirm('确定要移除图片吗？')) return;

    try {
      await api.updateScholar(id, {
        ...scholar,
        image: null,
        tagIds: scholar.tags.map(t => t.id),
        fieldOfResearch: scholar.fieldOfResearch,
        yearOfBirth: scholar.yearOfBirth,
        socialInfluence: scholar.socialInfluence,
        identity: scholar.identity.id,
        visible: scholar.visible !== undefined ? scholar.visible : true,
      }, token);

      alert('图片已移除');
      loadScholar();
    } catch (error) {
      console.error('Remove failed:', error);
      alert('移除失败: ' + error.message);
    }
  };

  const handleManageNews = async () => {
    setShowNewsModal(true);
    setNewsLoading(true);
    try {
      const response = await api.getAllNews({}, token);
      setAllNews(response.data || []);
    } catch (error) {
      console.error('Failed to load news:', error);
      alert('加载新闻列表失败: ' + error.message);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleNewsToggle = async (newsId) => {
    try {
      const newsItem = allNews.find(n => n.id === newsId);
      if (!newsItem) return;

      const isCurrentlyAssigned = scholar.news.some(n => n.id === newsId);

      // Get current scholar IDs from the news item, handling both array and undefined cases
      const currentScholarIds = Array.isArray(newsItem.scholars)
        ? newsItem.scholars.map(s => typeof s === 'string' ? s : s.id)
        : [];

      const newScholarIds = isCurrentlyAssigned
        ? currentScholarIds.filter(sid => sid !== id)
        : [...currentScholarIds, id];

      await api.updateNews(newsId, {
        title: newsItem.title,
        source: newsItem.source,
        url: newsItem.url,
        publishDate: new Date(newsItem.publishDate).toISOString(),
        scholarIds: newScholarIds,
      }, token);

      // Update local state immediately for better UX
      setScholar(prev => ({
        ...prev,
        news: isCurrentlyAssigned
          ? prev.news.filter(n => n.id !== newsId)
          : [...prev.news, newsItem]
      }));

      // Reload all news to get updated associations
      const response = await api.getAllNews({}, token);
      setAllNews(response.data || []);
    } catch (error) {
      console.error('Failed to update news association:', error);
      alert('更新失败: ' + error.message);
      // Reload scholar on error to ensure consistency
      await loadScholar();
    }
  };

  const handleCreateNews = async (e) => {
    e.preventDefault();
    try {
      await api.createNews({
        ...newNewsForm,
        publishDate: new Date(newNewsForm.publishDate).toISOString(),
        scholarIds: [id], // Automatically associate with current scholar
      }, token);

      // Reset form
      setNewNewsForm({
        title: '',
        source: '',
        url: '',
        publishDate: new Date().toISOString().split('T')[0],
      });
      setShowCreateNewsModal(false);

      // Reload scholar and news list
      await loadScholar();
      if (showNewsModal) {
        const response = await api.getAllNews({}, token);
        setAllNews(response.data || []);
      }

      alert('新闻创建成功');
    } catch (error) {
      console.error('Failed to create news:', error);
      alert('创建失败: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-xl text-red-600 mb-4">错误: {error}</div>
        <Link to="/admin/scholars" className="text-blue-600 hover:underline">
          返回人物列表
        </Link>
      </div>
    );
  }

  if (!scholar) {
    return (
      <div className="text-center py-8">
        <div className="text-xl text-gray-600 mb-4">未找到人物信息</div>
        <Link to="/admin/scholars" className="text-blue-600 hover:underline">
          返回人物列表
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">人物详情管理</h1>
        <div className="space-x-2">
          <Link
            to={`/admin/scholars/${id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            编辑基本信息
          </Link>
          <Link
            to={`/scholars/${id}`}
            target="_blank"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            查看公开页面
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">{scholar.name}</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-gray-600">性别:</span> {scholar.gender === 'M' ? '男' : '女'}
              </div>
              <div>
                <span className="text-gray-600">出生年份:</span> {scholar.yearOfBirth}
              </div>
              <div>
                <span className="text-gray-600">研究领域:</span> {scholar.fieldOfResearch}
              </div>
              <div>
                <span className="text-gray-600">身份:</span> {scholar.identity.name}
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              {scholar.reviewed && (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  已审核
                </span>
              )}
              {scholar.featured && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  推荐展示
                </span>
              )}
              {scholar.deleted && (
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                  已删除
                </span>
              )}
              {!scholar.visible && (
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                  已隐藏
                </span>
              )}
              {scholar.visible && !scholar.deleted && (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  公开可见
                </span>
              )}
            </div>

            {scholar.tags.length > 0 && (
              <div className="mb-4">
                <span className="text-gray-600 font-medium">标签:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {scholar.tags.map(tag => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 rounded text-sm"
                      style={{ backgroundColor: `#${tag.color}20`, color: `#${tag.color}` }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-3">简介</h3>
            <div className="prose max-w-none">
              <ReactMarkdown>{scholar.introduction}</ReactMarkdown>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-3">社会影响</h3>
            <div className="prose max-w-none">
              <ReactMarkdown>{scholar.socialInfluence}</ReactMarkdown>
            </div>
          </div>

          {/* News Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">相关新闻</h3>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  onClick={() => setShowCreateNewsModal(true)}
                >
                  + 快速添加
                </button>
                <button
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={handleManageNews}
                >
                  管理新闻
                </button>
              </div>
            </div>
            {scholar.news && scholar.news.length > 0 ? (
              <ul className="space-y-2">
                {scholar.news.map(item => (
                  <li key={item.id} className="border-b pb-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {item.title}
                    </a>
                    <div className="text-sm text-gray-500 mt-1">
                      {item.source} · {new Date(item.publishDate).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">暂无相关新闻</p>
            )}
          </div>
        </div>

        {/* Sidebar - Image Management */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">照片管理</h3>

            {scholar.image ? (
              <div className="space-y-4">
                <img
                  src={`/uploads/images/${scholar.imageFilename}`}
                  alt={scholar.name}
                  className="w-full rounded-lg"
                />
                <div className="space-y-2">
                  <label className="block">
                    <span className="sr-only">更换照片</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={imageUploadLoading}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </label>
                  <button
                    onClick={handleRemoveImage}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    移除照片
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">暂无照片</p>
                </div>
                <label className="block">
                  <span className="sr-only">上传照片</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={imageUploadLoading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </label>
              </div>
            )}

            {imageUploadLoading && (
              <div className="text-center text-sm text-gray-500 mt-2">
                上传中...
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">元数据</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">版本:</span> {scholar.version}
              </div>
              <div>
                <span className="text-gray-600">创建时间:</span>
                <div>{new Date(scholar.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-600">更新时间:</span>
                <div>{new Date(scholar.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* News Management Modal */}
      {showNewsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowNewsModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">管理相关新闻</h3>
              <button
                onClick={() => setShowNewsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {newsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {allNews.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">暂无新闻</p>
                ) : (
                  allNews.map((newsItem) => {
                    const isAssigned = scholar.news.some(n => n.id === newsItem.id);
                    return (
                      <div key={newsItem.id} className="flex items-start p-3 border rounded hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => handleNewsToggle(newsItem.id)}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{newsItem.title}</div>
                          <div className="text-sm text-gray-500">
                            {newsItem.source} · {new Date(newsItem.publishDate).toLocaleDateString()}
                          </div>
                          <a
                            href={newsItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {newsItem.url}
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowNewsModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create News Modal */}
      {showCreateNewsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowCreateNewsModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">快速添加新闻</h3>
              <button
                onClick={() => setShowCreateNewsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateNews} className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">标题 *</label>
                <input
                  type="text"
                  value={newNewsForm.title}
                  onChange={(e) => setNewNewsForm({ ...newNewsForm, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">来源 *</label>
                <input
                  type="text"
                  value={newNewsForm.source}
                  onChange={(e) => setNewNewsForm({ ...newNewsForm, source: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                  maxLength={255}
                  placeholder="例如: 新华网、人民日报等"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">链接 *</label>
                <input
                  type="url"
                  value={newNewsForm.url}
                  onChange={(e) => setNewNewsForm({ ...newNewsForm, url: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                  maxLength={1000}
                  placeholder="https://example.com/news/..."
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">发布日期 *</label>
                <input
                  type="date"
                  value={newNewsForm.publishDate}
                  onChange={(e) => setNewNewsForm({ ...newNewsForm, publishDate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div className="text-sm text-gray-500">
                此新闻将自动关联到当前人物
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateNewsModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
