import type { SerializedError } from '../types';

export class RemoteError extends Error {
  remoteError: SerializedError;

  constructor(message: string, remoteError: SerializedError) {
    super(message);
    this.name = RemoteError.name;
    this.remoteError = remoteError;
  }
}
