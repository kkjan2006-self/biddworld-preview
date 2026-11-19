export function normalizePaymentReference(value: string): string | null {
  const reference = value.trim();
  if (
    reference.length < 6 ||
    reference.length > 80 ||
    !/^[A-Za-z0-9./_-]+$/.test(reference)
  ) {
    return null;
  }
  return reference;
}
