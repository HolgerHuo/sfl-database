export default function ErrorState({ message, onRetry, fullPage = false }) {
  const content = (
    <div className={`flex flex-col items-center gap-4 text-center px-4 ${fullPage ? 'min-h-[40vh] justify-center' : 'py-12'}`}>
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
        <svg
          className="w-7 h-7 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">加载失败</h3>
        <p className="text-gray-500 text-sm max-w-sm">{message || '发生了未知错误，请稍后重试'}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          重试
        </button>
      )}
    </div>
  );

  return content;
}
