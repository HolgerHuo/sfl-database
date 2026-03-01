export default function LoadingSpinner({ message = '加载中...' }) {
  return (
    <div className="flex flex-col justify-center items-center min-h-[40vh] gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      {message && <p className="text-gray-500 text-sm">{message}</p>}
    </div>
  );
}
