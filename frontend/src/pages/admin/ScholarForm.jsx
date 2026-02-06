import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import MarkdownEditor from '../../components/MarkdownEditor';
import { useNavigate, useParams } from 'react-router-dom';

export default function ScholarForm() {
  const { id } = useParams();
  const isEditMode = !!id;
  const [form, setForm] = useState({
    name: '',
    gender: 'M',
    fieldOfResearch: '',
    yearOfBirth: new Date().getFullYear() - 30,
    introduction: '',
    socialInfluence: '',
    identity: '',
    tagIds: [],
    image: null,
    featured: false,
    visible: true,
    version: 1,
  });
  const [identities, setIdentities] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [user, setUser] = useState(null);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch (e) {
        console.error('Failed to decode token', e);
      }
    }
    loadData();
  }, [token]);

  async function loadData() {
    setDataLoading(true);
    try {
      const [identitiesData, tagsData] = await Promise.all([
        api.getIdentities(token),
        api.getTags()
      ]);
      setIdentities(identitiesData.data || []);
      setTags(tagsData.data || []);

      if (isEditMode) {
        // Load existing scholar data
        const scholarData = await api.getScholar(id, token);

        // Extract tag IDs - handle both nested and flat structures
        let tagIds = [];
        if (scholarData.tags && Array.isArray(scholarData.tags)) {
          tagIds = scholarData.tags.map(t => {
            if (t.tag && t.tag.id) return t.tag.id;
            if (t.id) return t.id;
            return null;
          }).filter(Boolean);
        }

        setForm({
          name: scholarData.name,
          gender: scholarData.gender,
          fieldOfResearch: scholarData.fieldOfResearch,
          yearOfBirth: scholarData.yearOfBirth,
          introduction: scholarData.introduction,
          socialInfluence: scholarData.socialInfluence,
          identity: scholarData.identity.id,
          tagIds: tagIds,
          image: scholarData.image,
          featured: scholarData.featured,
          visible: scholarData.visible !== undefined ? scholarData.visible : true,
          version: scholarData.version,
        });
      } else if (identitiesData.data?.length > 0) {
        setForm(f => ({ ...f, identity: identitiesData.data[0].id }));
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
      if (isEditMode) {
        await api.updateScholar(id, form, token);
        alert('更新成功');
      } else {
        await api.createScholar(form, token);
        alert('创建成功');
      }
      navigate('/admin/scholars');
    } catch (error) {
      console.error('操作失败:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-2xl font-bold">{isEditMode ? '编辑人物' : '创建人物'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block mb-2 font-medium">姓名 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
            maxLength={50}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 font-medium">性别 *</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="M">男</option>
              <option value="F">女</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium">出生年份 *</label>
            <input
              type="number"
              value={form.yearOfBirth}
              onChange={(e) => setForm({ ...form, yearOfBirth: parseInt(e.target.value) })}
              className="w-full border rounded px-3 py-2"
              required
              min={1900}
              max={new Date().getFullYear()}
            />
          </div>
        </div>

        <div>
          <label className="block mb-2 font-medium">研究领域 *</label>
          <input
            type="text"
            value={form.fieldOfResearch}
            onChange={(e) => setForm({ ...form, fieldOfResearch: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
            maxLength={25}
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">身份 *</label>
          <select
            value={form.identity}
            onChange={(e) => setForm({ ...form, identity: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          >
            {identities.map(identity => (
              <option key={identity.id} value={identity.id}>
                {identity.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-2 font-medium">标签</label>
          <div className="flex flex-wrap gap-2">
            {tags.map(tagItem => {
              const tag = tagItem.tag || tagItem; // Handle both {tag: {...}} and direct {...} structure
              return (
                <label key={tag.id} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={form.tagIds.includes(tag.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, tagIds: [...form.tagIds, tag.id] });
                      } else {
                        setForm({ ...form, tagIds: form.tagIds.filter(id => id !== tag.id) });
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="px-2 py-1 rounded text-sm" style={{ backgroundColor: `#${tag.color}20`, color: `#${tag.color}` }}>
                    {tag.name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block mb-2 font-medium">简介 * (支持 Markdown)</label>
          <MarkdownEditor
            value={form.introduction}
            onChange={(value) => setForm({ ...form, introduction: value })}
            placeholder="请输入人物简介..."
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">社会影响 * (支持 Markdown)</label>
          <MarkdownEditor
            value={form.socialInfluence}
            onChange={(value) => setForm({ ...form, socialInfluence: value })}
            placeholder="请输入社会影响..."
          />
        </div>

        <div className="space-y-2">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="mr-2"
            />
            推荐展示
          </label>

          <label className="inline-flex items-center ml-6">
            <input
              type="checkbox"
              checked={form.visible}
              onChange={(e) => setForm({ ...form, visible: e.target.checked })}
              className="mr-2"
            />
            公开可见
          </label>
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
            onClick={() => navigate('/admin')}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
