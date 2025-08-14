import { createClient } from 'redis';
 
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    reconnectStrategy: retries => {
      if (retries > 5) {
        console.error('Redis: Max retries reached');
        return new Error('Redis connection failed');
      }
      return 1000;  
    },
  },
});
 
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err.message);
});
 
redisClient.on('connect', () => {
  console.log('  Redis client connecting...');
});

redisClient.on('ready', () => {
  console.log('  Redis ready');
});
 
export async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      // Set a timeout for Redis connection
      const connectPromise = redisClient.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
      });

      await Promise.race([connectPromise, timeoutPromise]);
    }
    console.log('✅ Redis connected successfully');
  } catch (err) {
    console.warn('⚠️  Redis connection failed:', err.message);
    console.warn('⚠️  Service will continue without Redis caching');
  }
}

export default redisClient;
