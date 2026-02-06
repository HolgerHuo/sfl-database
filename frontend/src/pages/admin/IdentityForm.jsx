import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';

export default function IdentityForm() {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [form, setForm] = useState({
    name: '',
    description: '',
    displayOrder: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadIdentity();
    }
  }, [id]);

  async function loadIdentity() {
    try {
      const data = await api.getIdentity(id, token);
      setForm({
        name: data.name,
        description: data.description || '',
        displayOrder: data.displayOrder,
      });
    } catch (error) {
      console.error('Failed to load identity:', error);
      alert('加载身份失败: ' + error.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        displayOrder: form.displayOrder,
      };

      if (isEditMode) {
        await api.updateIdentity(id, payload, token);
        alert('更新成功');
      } else {
        await api.createIdentity(payload, token);
        alert('创建成功');
      }
      navigate('/admin/identities');
    } catch (error) {
      console.error('操作失败:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{isEditMode ? '编辑身份' : '创建身份'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block mb-2 font-medium">名称 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
            maxLength={255}
            placeholder="例如: 科学家、工程师、教育家等"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">描述</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="身份的详细描述..."
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">显示顺序</label>
          <input
            type="number"
            value={form.displayOrder}
            onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
            className="w-full border rounded px-3 py-2"
            min={0}
          />
          <p className="text-sm text-gray-500 mt-1">数字越小越靠前</p>
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
            onClick={() => navigate('/admin/identities')}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
