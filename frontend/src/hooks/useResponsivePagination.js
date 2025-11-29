import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to calculate responsive pagination based on viewport size
 * @param {Object} options - Configuration options
 * @param {number} options.itemHeight - Approximate height of each item in pixels (including gap)
 * @param {number} options.minItemsPerPage - Minimum items per page
 * @param {number} options.maxItemsPerPage - Maximum items per page
 * @returns {Object} - { pageSize, columns, rows }
 */
export function useResponsivePagination({
  itemHeight = 400, // Default height for ScholarCard + gap
  minItemsPerPage = 6,
  maxItemsPerPage = 48
} = {}) {
  const [pageSize, setPageSize] = useState(12);
  const [columns, setColumns] = useState(4);
  const [rows, setRows] = useState(3);

  const calculatePagination = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Calculate columns based on Tailwind breakpoints and grid configuration
    // Matching the grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 pattern
    let cols;
    if (width < 640) {
      // Mobile: 1 column
      cols = 1;
    } else if (width < 768) {
      // Small screens (sm): 2 columns
      cols = 2;
    } else if (width < 1024) {
      // Medium screens (md): 3 columns
      cols = 3;
    } else {
      // Large screens (lg+): 4 columns
      cols = 4;
    }
    
    // Calculate available height for content
    // Subtract header (~64px), page title (~120px), filters (~200px), pagination (~80px), padding
    const availableHeight = height - 500;
    
    // Calculate how many rows can fit
    const calculatedRows = Math.max(2, Math.floor(availableHeight / itemHeight));
    
    // Calculate page size
    let calculatedPageSize = cols * calculatedRows;
    
    // Apply min/max constraints
    calculatedPageSize = Math.max(minItemsPerPage, Math.min(maxItemsPerPage, calculatedPageSize));
    
    // Round to nearest multiple of columns for cleaner layout
    calculatedPageSize = Math.ceil(calculatedPageSize / cols) * cols;
    
    setColumns(cols);
    setRows(Math.ceil(calculatedPageSize / cols));
    setPageSize(calculatedPageSize);
  }, [itemHeight, minItemsPerPage, maxItemsPerPage]);

  useEffect(() => {
    // Calculate on mount
    calculatePagination();
    
    // Recalculate on window resize with debouncing
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculatePagination, 150);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [calculatePagination]);

  return { pageSize, columns, rows };
}
