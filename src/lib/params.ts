export function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Parses the `[handle]` segment, which must look like `@username`. */
export function parseHandle(raw: string): string | null {
  const handle = safeDecode(raw);
  if (!handle.startsWith("@")) return null;
  const username = handle.slice(1).toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(username) ? username : null;
}
