import { TimeoutError } from './timeout-error';

describe('TimeoutError', function () {
  it('should contain all expected properties.', function () {
    const err = new TimeoutError('Timeout message.');

    expect(err.name).toEqual('TimeoutError');
    expect(err.message).toEqual('Timeout message.');
  });

  it('should contain default messsage.', function () {
    const err = new TimeoutError();

    expect(err.message).toEqual('Timeout error.');
  });
});
