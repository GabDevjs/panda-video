import redis from 'redis';

const client = redis.createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  socket: {
    connectTimeout: 10000,
    commandTimeout: 5000,
    reconnectStrategy: (retries) => {
      if (retries > 3) return false;
      return Math.min(retries * 50, 500);
    }
  }
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

client.on('connect', () => {
  console.log('Connected to Redis');
});

client.on('ready', () => {
  console.log('Redis Client Ready');
});


if (!client.isOpen) {
  client.connect().catch(err => {
    console.error('Erro ao conectar ao Redis:', err);
  });
}

export default client;