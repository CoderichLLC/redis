const Redis = require('redis');
const Service = require('./Service');

const defaultLogger = new Proxy({}, {
  get(target, method, rec) {
    return (...args) => {
      console.log(...args); // eslint-disable-line
      return rec;
    };
  },
});

module.exports = class RedisCache {
  #client;
  #logger;
  #connection;
  #namespace;
  #resolvers = {};

  constructor(config = {}) {
    const { url, namespace, delim = ':', autoConnect = true, logger = defaultLogger } = config;

    // Config check
    const configKeys = Object.keys(config);
    const expectedKeys = ['url', 'namespace'];
    if (!expectedKeys.every(key => configKeys.indexOf(key) > -1)) throw new Error(`Config must define keys ${expectedKeys}, found ${configKeys}`);
    if (!namespace.length) throw new Error('Namespace cannot be empty');

    // Initialize
    this.#client = Redis.createClient({ url });
    this.#namespace = `${namespace}${delim}`;
    this.#logger = logger;
    if (autoConnect) this.connect();
  }

  /**
   * Get a key's value
   *
   * @param {string} key - The cache key (eg: 'name')
   * @param {function} [resolver] - A function to resolve when there's a cache miss; value will be set and returned
   * @param {int} [ttl] - A ttl value to use (along with the resolver) when there's a cache miss
   * @returns {*} - The resolved value from cache/resolver
   */
  get(key, resolver = this.#resolvers[key], ttl) {
    if (resolver) this.#resolvers[key] = resolver;

    return this.#connection.then(() => {
      return this.#client.get(`${this.#namespace}${key}`).catch((e) => {
        this.#logger.error('Redis GET key error:', key, e);
        return null;
      }).then((value) => {
        return value == null && resolver ? this.#resolve(resolver, key, ttl) : Service.deserialize(value);
      });
    });
  }

  /**
   * Set a key's value
   *
   * @param {string} key - The cache key (eg: 'name')
   * @param {*} value - The cache value
   * @param {int} [ttl] - Expiry time-to-live (in seconds)
   * @returns {string|null} - String 'OK' on success otherwise null
   */
  set(key, value, ttl) {
    if (value === undefined) return Promise.resolve(null); // Do now allow setting undefined

    return this.#connection.then(() => {
      return this.#client.set(`${this.#namespace}${key}`, Service.serialize(value), ttl ? { EX: ttl } : {}).catch((e) => {
        this.#logger.error('Redis SET key error:', key, value, e);
        return null;
      });
    });
  }

  /**
   * Delete a key
   *
   * @param {string} key - The cache key (eg: 'name')
   * @returns {string|null} - String 'OK' on success otherwise null
   */
  del(key) {
    return this.#connection.then(() => {
      return this.#client.del(`${this.#namespace}${key}`).catch((e) => {
        this.#logger.error('Redis DEL key error:', key, e);
        return null;
      });
    });
  }

  /**
   * Delete all keys
   *
   * @returns {array|null} - List of keys deleted on success otherwise null
   */
  flush() {
    return this.#connection.then(() => {
      return this.#client.keys(`${this.#namespace}*`).then((keys) => {
        return Promise.all(keys.map(key => this.#client.del(key))).then(() => keys);
      }).catch((e) => {
        this.#logger.error('Redis FLUSH keys error:', e);
        return null;
      });
    });
  }

  connect() {
    this.#connection = this.#client.connect().catch((e) => {
      this.#logger.error('Redis CONNECT error:', e);
      throw e;
    });
  }

  disconnect() {
    return this.#connection.then(() => this.#client.disconnect()).catch((e) => {
      this.#logger.error('Redis DISCONNECT error:', e);
      throw e;
    });
  }

  #resolve(resolver, key, ttl) {
    return Promise.resolve(resolver()).then(data => this.set(key, data, ttl).then(status => (status === 'OK' ? data : null)));
  }
};
