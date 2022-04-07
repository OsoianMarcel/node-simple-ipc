import { RemoteError } from './remote-error';

describe('RemoteError', function () {
  it('should contain all expected properties', function () {
    const err = new RemoteError('Remote error.', {
      message: 'Remote message.',
      stack: 'stk',
      name: 'Error',
    });

    expect(err.name).toEqual('RemoteError');
    expect(err.message).toEqual('Remote error.');
    expect(err.remoteError).toEqual({
      message: 'Remote message.',
      stack: 'stk',
      name: 'Error',
    });
  });
});
