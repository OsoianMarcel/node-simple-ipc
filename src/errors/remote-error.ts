import type { SerializedError } from '../types';

export class RemoteError extends Error {
  remoteError: SerializedError;

  constructor(message = 'Remote error.', remoteError: SerializedError) {
    super(message);
    this.name = RemoteError.name;
    this.remoteError = remoteError;
  }
}
