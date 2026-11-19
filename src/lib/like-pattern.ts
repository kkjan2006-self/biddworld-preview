/**
 * Escape user-entered text for a PostgreSQL LIKE/ILIKE pattern.
 * Backslash is escaped first so literal %, _ and backslashes stay literal.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, character => `\\${character}`);
}
