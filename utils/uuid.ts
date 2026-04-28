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
    typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
      ? (buf: Uint8Array) => crypto.getRandomValues(buf)
      : (buf: Uint8Array) => {
          for (let i = 0; i < buf.length; i++) buf[i] = (Math.random() * 256) | 0;
          return buf;
        };

  const rnds = new Uint8Array(16);
  getRandomValues(rnds);

  const byte6 = rnds[6];
  const byte8 = rnds[8];
  if (byte6 === undefined || byte8 === undefined) {
    throw new Error('UUID entropy buffer incomplete');
  }

  rnds[6] = (byte6 & 0x0f) | 0x40; // version 4
  rnds[8] = (byte8 & 0x3f) | 0x80; // variant 10

  const hex = Array.from(rnds, (b: number) => b.toString(16).padStart(2, '0'));
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
