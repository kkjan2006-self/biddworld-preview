export function csvCell(value: unknown): string {
  const raw = String(value ?? '');
  // Prefix formula-leading cells so spreadsheet apps treat untrusted values as text.
  const safe = /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function csvDocument(rows: readonly (readonly unknown[])[]): string {
  return '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
