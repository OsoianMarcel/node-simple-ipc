import { IpcDataType } from '../types';
import {
  assertValidIpcName,
  assertValidIpcHandler,
  isIpcInput,
  isIpcOutput,
  isIpcEvent,
} from './validation';

describe('assertValidIpcName()', function () {
  it('should not throw an error on a valid IPC name.', function () {
    expect(() => assertValidIpcName('hello')).not.toThrow();
  });

  it('should throw an error on an empty IPC name.', function () {
    expect(() => assertValidIpcName('')).toThrow();
  });
});

describe('assertValidIpcHandler()', function () {
  it('should not throw an error on a valid IPC handler.', function () {
    expect(() => assertValidIpcHandler(() => 1)).not.toThrow();
  });

  it('should throw an error on an invalid IPC handler.', function () {
    expect(() => assertValidIpcHandler(1)).toThrow();
  });
});

describe('isIpcInput()', function () {
  it('should return true on a valid input object.', function () {
    expect(
      isIpcInput({
        type: IpcDataType.Input,
        name: 'hello',
        correlationId: '123',
      }),
    ).toEqual(true);
  });

  it('should return false on an invalid input object.', function () {
    expect(isIpcInput(undefined)).toEqual(false);

    expect(
      isIpcInput({
        hello: 'world',
      }),
    ).toEqual(false);
  });
});

describe('isIpcOutput()', function () {
  it('should return true on a valid output object.', function () {
    expect(
      isIpcOutput({
        type: IpcDataType.Output,
        name: 'hello',
        correlationId: '321',
      }),
    ).toEqual(true);
  });

  it('should return false on an invalid output object.', function () {
    expect(isIpcOutput(undefined)).toEqual(false);

    expect(
      isIpcOutput({
        hello: 'world',
      }),
    ).toEqual(false);
  });
});

describe('isIpcEvent()', function () {
  it('should return true on a valid event object.', function () {
    expect(
      isIpcEvent({
        type: IpcDataType.Event,
        name: 'hello',
        data: '321',
      }),
    ).toEqual(true);
  });

  it('should return false on an invalid event object.', function () {
    expect(isIpcEvent(undefined)).toEqual(false);

    expect(
      isIpcEvent({
        name: 'world',
        type: 'event',
      }),
    ).toEqual(false);
  });
});
