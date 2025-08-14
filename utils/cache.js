import redisClient from '../config/redis.config.js';

/**
 * Redis Cache Utility
 * Provides helper functions for caching operations with proper error handling
 */
const cache = {
    /**
     * Check if Redis is connected
     * @returns {boolean} True if Redis is connected
     */
    isConnected() {
        return redisClient.isOpen && redisClient.isReady;
    },

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {Promise<string|null>} Cached value or null
     */
    async get(key) {
        try {
            if (!this.isConnected()) {
                return null; // Return null if Redis is not connected
            }
            return await redisClient.get(key);
        } catch (error) {
            console.error(`Cache GET error for key ${key}:`, error);
            return null; // Return null on error to allow fallback to database
        }
    },

    /**
     * Set value in cache with TTL
     * @param {string} key - Cache key
     * @param {string} value - Value to cache
     * @param {number} ttl - Time to live in seconds (default: 1 hour)
     */
    async set(key, value, ttl = 3600) {
        try {
            if (!this.isConnected()) {
                return; // Skip caching if Redis is not connected
            }
            await redisClient.set(key, value, { EX: ttl });
        } catch (error) {
            console.error(`Cache SET error for key ${key}:`, error);
            // Don't throw error as caching failure shouldn't break the request
        }
    },

    /**
     * Delete key from cache
     * @param {string} key - Cache key to delete
     */
    async del(key) {
        try {
            if (!this.isConnected()) {
                return; // Skip if Redis is not connected
            }
            await redisClient.del(key);
        } catch (error) {
            console.error(`Cache DEL error for key ${key}:`, error);
            // Don't throw error as cache deletion failure shouldn't break the request
        }
    },

    /**
     * Get keys matching a pattern
     * @param {string} pattern - Pattern to match (e.g., 'products:*')
     * @returns {Promise<Array>} Array of matching keys
     */
    async getKeys(pattern) {
        try {
            if (!this.isConnected()) {
                return []; // Return empty array if Redis is not connected
            }
            return await redisClient.keys(pattern);
        } catch (error) {
            console.error(`Cache KEYS error for pattern ${pattern}:`, error);
            return []; // Return empty array on error
        }
    },

    /**
     * Delete multiple keys
     * @param {Array} keys - Array of keys to delete
     */
    async delMultiple(keys) {
        if (!keys || keys.length === 0) return;

        try {
            if (!this.isConnected()) {
                return; // Skip if Redis is not connected
            }
            await redisClient.del(keys);
        } catch (error) {
            console.error(`Cache DEL MULTIPLE error:`, error);
            // Don't throw error as cache deletion failure shouldn't break the request
        }
    },

    /**
     * Check if key exists in cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} True if key exists
     */
    async exists(key) {
        try {
            if (!this.isConnected()) {
                return false; // Return false if Redis is not connected
            }
            const result = await redisClient.exists(key);
            return result === 1;
        } catch (error) {
            console.error(`Cache EXISTS error for key ${key}:`, error);
            return false;
        }
    },

    /**
     * Set expiration time for a key
     * @param {string} key - Cache key
     * @param {number} ttl - Time to live in seconds
     */
    async expire(key, ttl) {
        try {
            if (!this.isConnected()) {
                return; // Skip if Redis is not connected
            }
            await redisClient.expire(key, ttl);
        } catch (error) {
            console.error(`Cache EXPIRE error for key ${key}:`, error);
        }
    },

    /**
     * Get TTL for a key
     * @param {string} key - Cache key
     * @returns {Promise<number>} TTL in seconds (-1 if no expiry, -2 if key doesn't exist)
     */
    async ttl(key) {
        try {
            if (!this.isConnected()) {
                return -2; // Return -2 if Redis is not connected
            }
            return await redisClient.ttl(key);
        } catch (error) {
            console.error(`Cache TTL error for key ${key}:`, error);
            return -2; // Key doesn't exist
        }
    },

    /**
     * Flush all cache data (use with caution)
     */
    async flushAll() {
        try {
            if (!this.isConnected()) {
                throw new Error('Redis is not connected');
            }
            await redisClient.flushAll();
            console.log('Cache flushed successfully');
        } catch (error) {
            console.error('Cache FLUSH ALL error:', error);
            throw error; // This is a critical operation, so throw error
        }
    }
};

export default cache;
