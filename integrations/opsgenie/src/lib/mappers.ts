/**
 * Opsgenie documents incident `impactedServices` as an array of service ID strings,
 * but older responses may return `{ id }` objects. Accept both shapes.
 */
export let normalizeServiceIds = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  return value
    .map(item => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        let id = (item as Record<string, unknown>).id;
        return typeof id === 'string' ? id : undefined;
      }
      return undefined;
    })
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
};
