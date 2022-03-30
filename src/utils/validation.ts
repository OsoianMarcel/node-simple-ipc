import {
  IpcDataType,
  IpcInput,
  IpcOutput,
  IpcEvent,
  IpcHandler,
} from '../types';

export function assertValidIpcName(name: unknown): name is string {
  if (typeof name === 'string' && name.length > 0) {
    return true;
  }

  throw new Error('IPC name must be a not empty string.');
}

export function assertValidIpcHandler(
  handlerFn: unknown,
): handlerFn is IpcHandler {
  if (typeof handlerFn === 'function') {
    return true;
  }

  throw new Error('IPC handler must be a function.');
}

export function isIpcInput(data: unknown): data is IpcInput {
  if (typeof data !== 'object') {
    return false;
  }

  const input = data as Record<string, unknown>;

  return (
    'correlationId' in input &&
    'name' in input &&
    'type' in input &&
    input.type === IpcDataType.Input
  );
}

export function isIpcOutput(data: unknown): data is IpcOutput {
  if (typeof data !== 'object') {
    return false;
  }

  const output = data as Record<string, unknown>;

  return (
    'correlationId' in output &&
    'name' in output &&
    'type' in output &&
    output.type === IpcDataType.Output
  );
}

export function isIpcEvent(data: unknown): data is IpcEvent {
  if (typeof data !== 'object') {
    return false;
  }

  const event = data as Record<string, unknown>;

  return 'name' in event && 'type' in event && event.type === IpcDataType.Event;
}
