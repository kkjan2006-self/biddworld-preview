export function money(value: number, currency = 'INR'): string {
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'INR';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: safeCurrency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function left(endsAt: string, nowMs = Date.now()): string {
  const endTime = new Date(endsAt).getTime();
  if (!Number.isFinite(endTime)) return 'Unavailable';
  const remaining = endTime - nowMs;
  if (remaining <= 0) return 'Ended';
  const totalMinutes = Math.floor(remaining / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}
