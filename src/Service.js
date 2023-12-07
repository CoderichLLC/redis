const set = require('lodash.set');
const ObjectId = require('bson-objectid');

const flatten = (data, obj = {}, path = []) => {
  if (['[object Object]', '[object Array]'].includes(Object.prototype.toString.call(data)) && Object.keys(data).length && !ObjectId.isValid(data)) {
    return Object.entries(data).reduce((o, [key, value]) => {
      const $key = key.split('.').length > 1 ? `['${key}']` : key;
      return flatten(value, o, path.concat($key));
    }, obj);
  }

  if (path.length) {
    obj[path.join('.')] = data;
    return obj;
  }

  return data;
};

exports.flatten = (data) => {
  return exports.map(data, el => flatten(el));
};

exports.unflatten = (data) => {
  return exports.map(data, (el) => {
    return typeof data === 'object' ? Object.entries(el).reduce((prev, [key, value]) => {
      return set(prev, key, value);
    }, {}) : el;
  });
};

exports.map = (mixed, fn) => {
  if (mixed == null) return mixed;
  const isArray = Array.isArray(mixed);
  const arr = isArray ? mixed : [mixed];
  const results = arr.map((...args) => fn(...args));
  return isArray ? results : results[0];
};

exports.serialize = (mixed) => {
  if (typeof mixed !== 'object') return `${typeof mixed}{_$_}${mixed}`;

  return JSON.stringify(Object.entries(exports.flatten({ mixed })).reduce((prev, [key, value]) => {
    if (value instanceof Date) return set(prev, key, { $date: value });
    if (typeof value === 'object' && ObjectId.isValid(value)) return set(prev, key, { $oid: value });
    return set(prev, key, value);
  }, {}).mixed);
};

exports.deserialize = (mixed) => {
  try {
    return Object.entries(exports.flatten({ mixed: JSON.parse(mixed) })).reduce((prev, [key, value]) => {
      if (key.endsWith('$oid')) return set(prev, key.slice(0, -5), ObjectId(value));
      if (key.endsWith('$date')) return set(prev, key.slice(0, -6), new Date(value));
      return set(prev, key, value);
    }, {}).mixed;
  } catch (e) {
    const [type, value] = mixed.split('{_$_}');

    switch (type) {
      case 'boolean': return Boolean(value === 'true');
      case 'number': case 'bigint': return Number(value);
      case 'string': return value;
      default: return mixed;
    }
  }
};
