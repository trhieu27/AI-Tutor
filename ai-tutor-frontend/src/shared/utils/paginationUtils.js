/**
 * Generate pagination page numbers with ellipsis markers.
 * @param {number} currentPage
 * @param {number} totalPages
 * @returns {Array<number|string>} Array of page numbers and '...' markers
 */
export function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set([1, totalPages]);
  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
    pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push(result.includes("ellipsis-start") ? "ellipsis-end" : "ellipsis-start");
    }
    result.push(sorted[i]);
  }
  return result;
}
