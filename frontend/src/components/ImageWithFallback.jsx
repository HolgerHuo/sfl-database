import { useState } from 'react';

// Silhouette placeholder rendered inline (no external dependency)
function PersonPlaceholder({ className }) {
  return (
    <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
      <svg
        className="w-1/2 h-1/2 text-gray-300"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
      </svg>
    </div>
  );
}

export default function ImageWithFallback({ src, alt, className = '' }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <PersonPlaceholder className={className} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
