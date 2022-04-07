import { randomBytes } from 'crypto';

/**
 * Returns a unique id.
 *
 * @returns Next unique id.
 */
export function uniqueId(): string {
  return randomBytes(16).toString('hex');
}
