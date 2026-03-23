/**
 * Generate a UUID v4 string.
 * Falls back to a manual implementation when crypto.randomUUID()
 * is unavailable (e.g. non-secure HTTP contexts).
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: RFC 4122 v4 UUID using crypto.getRandomValues or Math.random
  const getRandomValues =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? (buf: Uint8Array) => crypto.getRandomValues(buf)
      : (buf: Uint8Array) => {
          for (let i = 0; i < buf.length; i++) buf[i] = (Math.random() * 256) | 0;
          return buf;
        };

  const rnds = new Uint8Array(16);
  getRandomValues(rnds);
  rnds[6] = (rnds[6] & 0x0f) | 0x40; // version 4
  rnds[8] = (rnds[8] & 0x3f) | 0x80; // variant 10

  const hex = Array.from(rnds, (b) => b.toString(16).padStart(2, '0'));
  return (
    hex.slice(0, 4).join('') +
    '-' +
    hex.slice(4, 6).join('') +
    '-' +
    hex.slice(6, 8).join('') +
    '-' +
    hex.slice(8, 10).join('') +
    '-' +
    hex.slice(10).join('')
  );
}
