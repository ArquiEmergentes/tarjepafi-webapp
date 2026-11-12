/** Ids de cliente (json-server no los genera con prefijo). */
export function newId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(16).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}${random}`;
}
