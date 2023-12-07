const { RedisMemoryServer } = require('redis-memory-server');
const Redis = require('./src/Redis');

let redisServer;

beforeAll(async () => {
  redisServer = new RedisMemoryServer();
  const host = await redisServer.getHost();
  const port = await redisServer.getPort();
  const url = `redis://${host}:${port}`;
  global.redis = new Redis({ url, namespace: 'redis-cache', autoTransform: true });
});

afterAll(() => {
  return global.redis.disconnect().then(() => redisServer.stop());
});
