let readQueryParam = (url: string, name: string) => {
  let queryIndex = url.indexOf('?');
  if (queryIndex === -1) return undefined;

  // Opsgenie occasionally returns malformed paging links (for example `?offset=20?limit=20`),
  // so split on both separators instead of relying on URLSearchParams alone.
  for (let pair of url.slice(queryIndex + 1).split(/[&?]/)) {
    let separator = pair.indexOf('=');
    if (separator === -1) continue;
    if (pair.slice(0, separator) === name)
      return decodeURIComponent(pair.slice(separator + 1));
  }

  return undefined;
};

/**
 * Reads the next-page cursor from an Opsgenie `paging` object.
 * Offset-paginated list endpoints (alerts, incidents, users, services) return numeric offsets,
 * while notes/logs return opaque string offsets.
 */
export let getNextPageOffset = (paging: unknown) => {
  if (typeof paging !== 'object' || paging === null) return undefined;

  let next = (paging as Record<string, unknown>).next;
  if (typeof next !== 'string' || next.length === 0) return undefined;

  return readQueryParam(next, 'offset');
};

export let getNextNumericOffset = (paging: unknown) => {
  let offset = getNextPageOffset(paging);
  if (offset === undefined) return undefined;

  let value = Number(offset);
  return Number.isFinite(value) ? value : undefined;
};
