import redisClient from '../config/redis.js';

const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    
    const key = `cache_${req.originalUrl}_${req.user?.id || 'anonymous'}`;
    
    try {
      const cached = await redisClient.get(key);
      
      if (cached) {
        console.log(`Cache hit: ${key}`);
        return res.json(JSON.parse(cached));
      }
      
      console.log(`Cache miss: ${key}`);
      
      
      const originalJson = res.json;
      res.json = function(data) {
        
        if (res.statusCode === 200) {
          redisClient.setEx(key, duration, JSON.stringify(data))
            .catch(error => console.warn('Cache save error:', error));
        }
        
        return originalJson.call(this, data);
      };
      
      next();
      
    } catch (error) {
      console.warn('Cache middleware error:', error);
      next();
    }
  };
};

const invalidateCache = (pattern) => {
  return async (req, res, next) => {
    try {
      
      const originalJson = res.json;
      res.json = function(data) {
        
        if (res.statusCode < 400) {
          redisClient.del(pattern.replace('*', req.user?.id || ''))
            .catch(error => console.warn('Cache invalidation error:', error));
        }
        
        return originalJson.call(this, data);
      };
      
      next();
      
    } catch (error) {
      console.warn('Cache invalidation middleware error:', error);
      next();
    }
  };
};

export { cacheMiddleware, invalidateCache };