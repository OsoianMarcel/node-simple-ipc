import { serializeError } from './serialize-error';

describe('serializeError()', function () {
  it('should return error name, message and trace.', function () {
    const remoteError = serializeError(new Error('Test'));

    expect(remoteError).toHaveProperty('message', 'Test');
    expect(remoteError).toHaveProperty('name', 'Error');
    expect(remoteError).toHaveProperty('stack');
    expect(Object.keys(remoteError)).toHaveLength(3);
  });

  it('should return just error name.', function () {
    expect(serializeError(123)).toEqual({
      message: '123',
    });
  });
});
