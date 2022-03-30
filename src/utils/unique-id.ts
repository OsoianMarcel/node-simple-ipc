let prevUniqueId = 0;

/**
 * Returns a unique id.
 *
 * @returns Next unique id.
 */
export function uniqueId(): number {
  const now = Date.now();

  if (now <= prevUniqueId) {
    return ++prevUniqueId;
  }

  prevUniqueId = now;

  return now;
}
