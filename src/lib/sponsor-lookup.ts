/**
 * Accept both the current boolean-only sponsor lookup contract and the
 * legacy Production table response while the forward-only migration is
 * awaiting the verified deployment window. The legacy display name is
 * deliberately ignored by the UI.
 */
export function isSponsorLookupValid(data: unknown, requestedCode: string): boolean {
  if (data === true) return true;
  if (!Array.isArray(data)) return false;

  const expected = requestedCode.trim().toUpperCase();
  if (!expected) return false;

  return data.some((row: unknown) => {
    if (!row || typeof row !== 'object') return false;
    const memberCode = (row as { member_code?: unknown }).member_code;
    return typeof memberCode === 'string' && memberCode.trim().toUpperCase() === expected;
  });
}
