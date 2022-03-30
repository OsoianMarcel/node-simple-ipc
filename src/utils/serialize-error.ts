import { SerializedError } from '../types';

export function serializeError(err: unknown): SerializedError {
  if (err instanceof Error) {
    return {
      name: err.name,
      stack: err.stack,
      message: err.message,
    };
  }

  return {
    message: String(err),
  };
}
