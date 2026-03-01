export default function Pagination({ pagination, page, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { totalPages, total } = pagination;

  // Build page numbers to display (window of 5 around current page)
  const buildPages = () => {
    const pages = [];
    const delta = 2;
    const range = [];
    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (page - delta > 2) range.unshift('...');
    if (page + delta < totalPages - 1) range.push('...');

    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);

    return range;
  };

  const pages = buildPages();

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-gray-600"
          aria-label="上一页"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="h-9 w-9 flex items-center justify-center text-gray-400 text-sm">
              ···
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-9 w-9 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                page === p
                  ? 'bg-blue-600 text-white border border-blue-600'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-gray-600"
          aria-label="下一页"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <p className="text-xs text-gray-400">
        第 {page} / {totalPages} 页
        {total !== undefined && `，共 ${total} 项`}
      </p>
    </div>
  );
}
