import { z } from 'zod';
import { ContentfulClient } from './client';
import type { ApiMode, Region } from './http';
import { invalid, parseInput, resourceId } from './schemas';
export interface Selection {
  spaceId?: string;
  environmentId?: string;
  region?: Region;
}
export interface AuthOutput {
  token: string;
  mode?: ApiMode;
  region?: Region;
  refreshToken?: string;
  expiresAt?: string;
}
export let createClient = (
  config: Selection,
  auth: AuthOutput,
  input: Selection & { api?: ApiMode } = {},
  global = false
): ContentfulClient => {
  let authMode =
    auth.mode === undefined
      ? undefined
      : parseInput(z.enum(['management', 'delivery', 'preview']), auth.mode);
  let authRegion =
    auth.region === undefined ? undefined : parseInput(z.enum(['us', 'eu']), auth.region);
  if (authRegion && config.region && authRegion !== config.region)
    throw invalid(
      'The saved legacy region conflicts with the authentication region. Reconnect in the correct region or remove the legacy region override.'
    );
  if (authMode && input.api && authMode !== input.api)
    throw invalid(
      'The selected API differs from the authenticated credential type. Reconnect using its matching API credential.'
    );
  let spaceId = input.spaceId ?? config.spaceId;
  if (!global && !spaceId)
    throw invalid(
      'Choose a spaceId from list_spaces or save an optional default space. Delivery and preview keys require the space ID from their API key settings.'
    );
  return new ContentfulClient({
    token: auth.token,
    mode: authMode ?? input.api,
    spaceId: spaceId ? parseInput(resourceId, spaceId) : undefined,
    environmentId: parseInput(
      resourceId,
      input.environmentId ?? config.environmentId ?? 'master'
    ),
    region: authRegion ?? parseInput(z.enum(['us', 'eu']), config.region ?? 'us')
  });
};
export let pageInfo = (page: {
  total: number;
  skip: number;
  limit: number;
  nextSkip?: number;
  hasMore: boolean;
}) => ({
  total: page.total,
  skip: page.skip,
  limit: page.limit,
  nextSkip: page.nextSkip,
  hasMore: page.hasMore
});
export let mergeQuery = (
  params: Record<string, string | number | boolean>,
  extra?: Record<string, string>
) => {
  for (let [key, value] of Object.entries(extra ?? {})) {
    if (
      [
        'access_token',
        'authorization',
        'locale',
        'cursor',
        'select',
        'limit',
        'skip'
      ].includes(key.toLowerCase()) ||
      key in params
    )
      throw invalid(
        'Use the dedicated paging fields and all-locale representation. Do not override credentials or selected query fields.'
      );
    params[key] = value;
  }
};
export let releaseEntityCount = (value: unknown): number | undefined => {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'items' in value &&
    Array.isArray(value.items)
  )
    return value.items.length;
  return undefined;
};
