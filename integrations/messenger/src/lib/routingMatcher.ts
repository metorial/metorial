/**
 * Routing identity shared by the webhook `process` handler (built from the
 * signed delivery's `entry[].id`) and the trigger group's `routingMatchers`
 * (built from the connection's Page). Keeping both sides on one helper keeps
 * field names and value normalization identical.
 */
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
