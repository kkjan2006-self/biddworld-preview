export type AuditSearchEntry = {
  action: string;
  actor_name: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
};

export function filterAuditEntries<T extends AuditSearchEntry>(
  entries: readonly T[],
  query: string,
): T[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [...entries];
  return entries.filter(entry =>
    [entry.action, entry.actor_name, entry.entity_type, entry.entity_id ?? '', JSON.stringify(entry.details ?? {})]
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalized),
  );
}
