// Shared by `process` and `routingMatchers` so both sides normalize identically.
export interface MessengerPageRoutingMatcher {
  object: 'page';
  pageId: string;
}

export let normalizeMessengerPageId = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return undefined;
  let trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export let buildMessengerPageRoutingMatcher = (
  pageId: string
): MessengerPageRoutingMatcher => ({
  object: 'page',
  pageId
});

export let resolveMessengerConnectionPageId = (
  auth: { pageId?: string | null } | undefined,
  config: { pageId?: string | null } | undefined
) => normalizeMessengerPageId(auth?.pageId) ?? normalizeMessengerPageId(config?.pageId);

export let buildMessengerConnectionRoutingMatchers = (
  auth: { pageId?: string | null } | undefined,
  config: { pageId?: string | null } | undefined
): MessengerPageRoutingMatcher[] => {
  let pageId = resolveMessengerConnectionPageId(auth, config);
  return pageId ? [buildMessengerPageRoutingMatcher(pageId)] : [];
};
