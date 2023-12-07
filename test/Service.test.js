const Service = require('../src/Service');

describe('Service', () => {
  test('flatten', () => {
    expect(Service.flatten([])).toEqual([]);
    expect(Service.flatten({ mixed: [1] })).toEqual({ 'mixed.0': 1 });
    expect(Service.flatten({ mixed: [] })).toEqual({ mixed: [] });
  });

  test('serialize', () => {
    expect(Service.serialize('hello')).toEqual('string{_$_}hello');
    expect(Service.serialize({ a: 'a' })).toEqual('{"a":"a"}');
    expect(Service.serialize({})).toEqual('{}');
    expect(Service.serialize([])).toEqual('[]');
  });
});
