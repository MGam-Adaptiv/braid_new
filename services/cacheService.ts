/**
 * Simple client-side cache for AI responses to save tokens and improve performance.
 */
export const cacheService = {
  /**
   * Retrieves a cached response based on the prompt hash.
   */
  getCachedResponse: async (prompt: string): Promise<string | null> => {
    try {
      const hash = btoa(unescape(encodeURIComponent(prompt))).slice(0, 32);
      return localStorage.getItem(`braid_cache_${hash}`);
    } catch (e) {
      return null;
    }
  },

  /**
   * Saves a response to the local storage cache.
   */
  saveResponse: async (prompt: string, response: string): Promise<void> => {
    try {
      const hash = btoa(unescape(encodeURIComponent(prompt))).slice(0, 32);
      localStorage.setItem(`braid_cache_${hash}`, response);
    } catch (e) {
      console.warn("Cache save failed:", e);
    }
  },

  /**
   * Clears the entire AI cache.
   */
  clearCache: () => {
    Object.keys(localStorage)
      .filter(key => key.startsWith('braid_cache_'))
      .forEach(key => localStorage.removeItem(key));
  }
};
