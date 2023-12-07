const ObjectId = require('bson-objectid');
const Redis = require('../src/Redis');

describe('Redis', () => {
  let cache;
  const config = { autoConnect: false };
  const complexObj = [
    'scalar',
    { id: new ObjectId(), age: 20, birthday: new Date(), citizen: true },
    { id: new ObjectId(), age: 30, birthday: new Date(), citizen: 'false' },
    { arr: ['a', 'b', 'c', { id: new ObjectId(), arr: ['d', 'e', 'f'] }] },
    { 'http://some.thing.com': 'value' },
    { 'http://some.thing.com': { a: 'a', 'http://some.thing.org': [1, 2, 3, new ObjectId()] } },
    { empty: [] },
  ];

  beforeAll(() => {
    cache = global.redis;
  });

  test('constructor', () => {
    expect(() => new Redis(config)).toThrow();
    expect(() => new Redis(Object.assign(config, { url: '' }))).toThrow();
    expect(() => new Redis(Object.assign(config, { namespace: '' }))).toThrow();
    expect(() => new Redis(Object.assign(config, { namespace: 'test' }))).not.toThrow();
  });

  test('get', async () => {
    expect(await cache.get('key1')).toBeNull();
    expect(await cache.get('key1', () => 123)).toBe(123);
    expect(await cache.get('key1')).toBe(123);
    expect(await cache.get('key2', () => Promise.resolve(true))).toBe(true);
    expect(await cache.get('key2')).toBe(true);
    expect(await cache.get('key3', () => undefined)).toBeNull();
    expect(await cache.get('key3')).toBeNull();
  });

  test('set', async () => {
    expect(await cache.set('undefined', undefined)).toBeNull();
    expect(await cache.get('undefined')).toBeNull();
    expect(await cache.set('null', null)).toBe('OK');
    expect(await cache.get('null')).toBeNull();
    expect(await cache.set('hello', 'world')).toBe('OK');
    expect(await cache.get('hello')).toBe('world');
    expect(await cache.set('empty', [])).toBe('OK');
    expect(await cache.get('empty')).toEqual([]);
  });

  test('del', async () => {
    await cache.del('key1');
    expect(await cache.get('key1')).toBe(123);
    expect(await cache.get('key2')).toBe(true);
  });

  test('jsonStringify', async () => {
    const key = JSON.stringify({ a: { b: 'c' } });
    await cache.set(key, complexObj);
    expect(await cache.get(key)).toEqual(complexObj);
  });

  test('flush', async () => {
    expect((await cache.flush()).sort()).toEqual([
      'redis-cache:empty',
      'redis-cache:key1',
      'redis-cache:key2',
      'redis-cache:null',
      'redis-cache:hello',
      'redis-cache:{"a":{"b":"c"}}',
    ].sort());
  });

  test('complexObj', async () => {
    await cache.set('obj', complexObj);
    expect(await cache.get('obj')).toEqual(complexObj);
  });
});
