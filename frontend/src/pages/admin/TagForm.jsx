import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';

// Color Picker Modal Component
function ColorPickerModal({ isOpen, onClose, currentColor, onSelectColor }) {
  const [selectedColor, setSelectedColor] = useState(currentColor);

  const commonColors = [
    { name: '蓝色', value: '3B82F6' },
    { name: '红色', value: 'EF4444' },
    { name: '绿色', value: '10B981' },
    { name: '黄色', value: 'F59E0B' },
    { name: '紫色', value: '8B5CF6' },
    { name: '粉色', value: 'EC4899' },
    { name: '青色', value: '06B6D4' },
    { name: '橙色', value: 'F97316' },
    { name: '靛蓝', value: '6366F1' },
    { name: '玫红', value: 'F43F5E' },
    { name: '翠绿', value: '14B8A6' },
    { name: '灰色', value: '6B7280' },
    { name: '石墨', value: '374151' },
    { name: '棕色', value: '92400E' },
    { name: '深紫', value: '7C3AED' },
    { name: '薄荷', value: '34D399' },
  ];

  useEffect(() => {
    setSelectedColor(currentColor);
  }, [currentColor]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">选择颜色</h3>

        {/* Common colors */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">常用颜色:</p>
          <div className="grid grid-cols-8 gap-2">
            {commonColors.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setSelectedColor(`#${color.value}`)}
                className={`aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                  selectedColor.replace('#', '').toUpperCase() === color.value.toUpperCase()
                    ? 'border-gray-900 ring-2 ring-gray-400'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: `#${color.value}` }}
                title={color.name}
              >
                {selectedColor.replace('#', '').toUpperCase() === color.value.toUpperCase() && (
                  <svg className="w-full h-full p-1 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom color */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">自定义颜色:</p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-16 h-16 border-2 border-gray-300 rounded-lg cursor-pointer"
            />
            <div className="flex-1">
              <input
                type="text"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-full border rounded px-3 py-2 font-mono text-sm"
                pattern="^#[0-9A-Fa-f]{6}$"
                placeholder="#3B82F6"
              />
            </div>
            <div
              className="w-16 h-16 border-2 border-gray-300 rounded-lg"
              style={{ backgroundColor: selectedColor }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectColor(selectedColor);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TagForm() {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    featured: false,
    displayOrder: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadTag();
    }
  }, [id]);

  async function loadTag() {
    try {
      const data = await api.getAdminTag(id, token);
      setForm({
        name: data.name,
        description: data.description || '',
        color: data.color ? `#${data.color}` : '#3B82F6',
        featured: !!data.featured,
        displayOrder: data.displayOrder,
      });
    } catch (error) {
      console.error('Failed to load tag:', error);
      alert('加载标签失败: ' + error.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        color: form.color || null,
        featured: form.featured,
        displayOrder: form.displayOrder,
      };

      if (isEditMode) {
        await api.updateTag(id, payload, token);
        alert('更新成功');
      } else {
        await api.createTag(payload, token);
        alert('创建成功');
      }
      navigate('/admin/tags');
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
        <h1 className="text-2xl font-bold">{isEditMode ? '编辑标签' : '创建标签'}</h1>
      </div>

      <ColorPickerModal
        isOpen={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        currentColor={form.color}
        onSelectColor={(color) => setForm({ ...form, color })}
      />

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
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">描述</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="标签的详细描述..."
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">颜色</label>
          <button
            type="button"
            onClick={() => setShowColorPicker(true)}
            className="flex items-center gap-3 px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
          >
            <div
              className="w-8 h-8 rounded border border-gray-300"
              style={{ backgroundColor: form.color }}
            />
            <span className="font-mono text-sm">{form.color}</span>
            <span className="text-gray-500 text-sm ml-auto">点击选择颜色</span>
          </button>
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

        <div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium">首页推荐标签</span>
          </label>
          <p className="text-sm text-gray-500 mt-1">勾选后会在首页展示该标签及其随机人物</p>
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
            onClick={() => navigate('/admin/tags')}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
