const crypto = require('crypto');

/**
 * In-memory analysis cache with TTL
 */
class AIAnalysisCache {
  constructor(ttlMs = 24 * 60 * 60 * 1000) { // 24 hours default TTL
    this.cache = new Map();
    this.ttlMs = ttlMs;
  }

  /**
   * Generates a deterministic cache key from input metadata
   */
  generateKey({ beforeHash, afterHash, challengeDescription, categoryName, model, rulesVersion = '1.0.0' }) {
    const raw = `${beforeHash || ''}_${afterHash || ''}_${(challengeDescription || '').trim().toLowerCase()}_${categoryName || ''}_${model || ''}_${rulesVersion}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Gets cached analysis if available and not expired
   */
  get(key) {
    if (process.env.AI_BEFORE_AFTER_CACHE_ENABLED === 'false') {
      return null;
    }
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return { ...entry.data, isCached: true };
  }

  /**
   * Stores an analysis result
   */
  set(key, data) {
    if (process.env.AI_BEFORE_AFTER_CACHE_ENABLED === 'false') {
      return;
    }
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Cleanup oldest if cache exceeds 1000 entries
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }

  /**
   * Clears the cache
   */
  clear() {
    this.cache.clear();
  }
}

const analysisCacheInstance = new AIAnalysisCache();

module.exports = analysisCacheInstance;
