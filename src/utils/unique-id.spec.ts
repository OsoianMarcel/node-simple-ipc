import { uniqueId } from './unique-id';

describe('uniqueId()', function () {
  test('compare next id with previous id 10 times in a row.', () => {
    let prev = uniqueId();

    for (let i = 0; i < 10; i++) {
      const next = uniqueId();

      expect(next).not.toEqual(prev);

      prev = next;
    }
  });
});
