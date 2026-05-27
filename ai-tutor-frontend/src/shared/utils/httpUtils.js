/**
 * Safely parse JSON from a Response, returning a fallback on failure.
 * @param {Response} response - Fetch API Response object
 * @param {*} [fallback={}] - Value to return if parsing fails
 * @returns {Promise<*>} Parsed JSON or fallback
 */
export async function safeJson(response, fallback = {}) {
  try {
    return await response.json();
  } catch {
    return fallback;
  }
}
