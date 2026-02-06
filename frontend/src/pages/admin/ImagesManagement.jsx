import { useState, useEffect } from 'react';
import { api } from '../../api';

export default function ImagesManagement() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const token = localStorage.getItem('token');
  const pageSize = 20;

  useEffect(() => {
    loadImages();
  }, [page]);

  async function loadImages() {
    try {
      const response = await api.listImages({ page, pageSize }, token);
      setImages(response.data || []);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load images:', error);
      alert('加载图片失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await api.uploadImage(file, token);
      alert('上传成功');
      e.target.value = '';
      setPage(1);
      loadImages();
    } catch (error) {
      console.error('Failed to upload:', error);
      alert('上传失败: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id, filename) {
    if (!confirm(`确定要删除图片"${filename}"吗？\n\n警告：如果有人物正在使用此图片，删除后将无法显示。`)) return;
    try {
      await api.deleteImage(id, token);
      alert('删除成功');
      loadImages();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('删除失败: ' + error.message);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleString('zh-CN');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">图片管理</h2>
        <label className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer">
          {uploading ? '上传中...' : '+ 上传图片'}
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif,image/svg+xml"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <p className="text-sm text-gray-600">
          支持格式: JPG, PNG, GIF, WebP, HEIC, HEIF, SVG
        </p>
        <p className="text-sm text-gray-600">
          最大文件大小: 50 MB
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            暂无图片
          </div>
        ) : (
          images.map((image) => (
            <div key={image.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                <img
                  src={`/uploads/images/${image.filename}`}
                  alt={image.filename}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="text-gray-400">无法加载</div>';
                  }}
                />
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-600 truncate" title={image.filename}>
                  {image.filename}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatBytes(image.sizeBytes)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(image.createdAt)}
                </p>
                <div className="mt-2 flex gap-2">
                  <a
                    href={`/uploads/images/${image.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    查看
                  </a>
                  <button
                    onClick={() => handleDelete(image.id, image.filename)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="px-4 py-2">
            第 {page} / {pagination.totalPages} 页
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
