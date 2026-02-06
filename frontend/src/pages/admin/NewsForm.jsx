import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';

export default function NewsForm() {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [form, setForm] = useState({
    title: '',
    source: '',
    url: '',
    publishDate: new Date().toISOString().split('T')[0],
    scholars: [],
  });
  const [scholars, setScholars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const scholarsData = await api.getAllScholars({}, token);
      setScholars(scholarsData.data || []);

      if (isEditMode) {
        const newsData = await api.getNewsById(id, token);
        setForm({
          title: newsData.title,
          source: newsData.source,
          url: newsData.url,
          publishDate: new Date(newsData.publishDate).toISOString().split('T')[0],
          scholars: newsData.scholars?.map(s => s.id) || [],
        });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      alert('加载数据失败: ' + error.message);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        title: form.title,
        source: form.source,
        url: form.url,
        publishDate: new Date(form.publishDate).toISOString(),
        scholarIds: form.scholars,
      };

      if (isEditMode) {
        await api.updateNews(id, payload, token);
        alert('更新成功');
      } else {
        await api.createNews(payload, token);
        alert('创建成功');
      }
      navigate('/admin/news');
    } catch (error) {
      console.error('操作失败:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleScholarToggle(scholarId) {
    setForm(prev => ({
      ...prev,
      scholars: prev.scholars.includes(scholarId)
        ? prev.scholars.filter(id => id !== scholarId)
        : [...prev.scholars, scholarId]
    }));
  }

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{isEditMode ? '编辑新闻' : '创建新闻'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block mb-2 font-medium">标题 *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
            maxLength={500}
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">来源 *</label>
          <input
            type="text"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
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
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
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
            value={form.publishDate}
            onChange={(e) => setForm({ ...form, publishDate: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">相关人物</label>
          <div className="border rounded p-4 max-h-64 overflow-y-auto">
            {scholars.length === 0 ? (
              <p className="text-gray-500">暂无人物</p>
            ) : (
              <div className="space-y-2">
                {scholars.map((scholar) => (
                  <label key={scholar.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.scholars.includes(scholar.id)}
                      onChange={() => handleScholarToggle(scholar.id)}
                      className="mr-2"
                    />
                    <span>{scholar.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            已选择 {form.scholars.length} 人
          </p>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '提交中...' : (isEditMode ? '更新' : '创建')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/news')}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
