/**
 * Generate a unique ID string using random characters and timestamp.
 * @returns {string} Unique identifier
 */
export function generateUniqueId() {
  return Math.random().toString(36).slice(2, 11) + Date.now();
}
