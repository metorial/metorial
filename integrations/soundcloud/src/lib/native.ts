import { AuthConfigSecretRedactor, buildApiServiceError, createApiServiceError } from 'slates';
import { z } from 'zod';

export { z };
export const fail = (message: string) =>
  createApiServiceError(message, { reason: 'soundcloud_validation' });
export const upstream = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'SoundCloud',
    reason: 'soundcloud_api',
    parent: {},
    extractMessage: () => '',
    formatMessage: ({ status }) =>
      `SoundCloud request failed${typeof status === 'number' ? ` (HTTP ${status})` : ''}. ${status === 401 ? 'Reconnect the SoundCloud account or application.' : status === 403 ? 'Check resource access and authentication mode.' : status === 404 ? 'The exact resource or relationship was not found; cleanup is not assumed.' : status === 429 ? 'Rate limited; wait before a deliberate retry.' : 'Read the exact resource before retrying an uncertain write.'}`
  });
export function required(value: unknown, label: string, maximum = 4096): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum)
    throw fail(`${label} is required and must be within ${maximum} characters.`);
  for (const c of value) {
    const n = c.charCodeAt(0);
    if ((n < 32 && ![9, 10, 13].includes(n)) || n === 127)
      throw fail(`${label} contains unsupported control characters.`);
  }
  return value;
}
export const count = z.number().int().nonnegative().safe();
const text = z.string().nullable().optional(),
  metric = count.nullable().optional();
export function identifier(
  value: unknown,
  kind: 'tracks' | 'playlists' | 'users' | 'comments'
): string {
  const input = required(value, `${kind} ID`, 256);
  if (/^[1-9][0-9]*$/.test(input)) return `soundcloud:${kind}:${input}`;
  if (!new RegExp(`^soundcloud:${kind}:[1-9][0-9]*$`).test(input))
    throw fail(`Use a SoundCloud ${kind} URN or its documented positive numeric ID alias.`);
  return input;
}
export const segment = (value: unknown, kind: Parameters<typeof identifier>[1]) =>
  encodeURIComponent(identifier(value, kind));
export function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    throw fail(`${label} must be an integer from ${min} to ${max}.`);
  return value;
}
export const limit = (value?: number) => integer(value ?? 50, 'limit', 1, 200);
export function guard(value: unknown, auth: Record<string, unknown>): void {
  const secrets = [auth.token, auth.refreshToken, auth.clientSecret].filter(
    (v): v is string => typeof v === 'string' && v.length > 3
  );
  const redactor = new AuthConfigSecretRedactor({
    token: auth.token,
    refreshToken: auth.refreshToken,
    clientSecret: auth.clientSecret
  });
  const variants = new Set(secrets);
  for (const secret of secrets) {
    let url = secret,
      base64 = secret,
      percent = [...Buffer.from(secret)]
        .map(byte => `%${byte.toString(16).padStart(2, '0')}`)
        .join('');
    for (let i = 0; i < 5; i++) {
      url = encodeURIComponent(url);
      base64 = Buffer.from(base64).toString('base64');
      variants.add(url);
      variants.add(base64);
      variants.add(percent);
      variants.add(percent.toUpperCase());
      percent = encodeURIComponent(percent);
    }
  }
  const patterns = [...variants];
  const reflected = (s: string) =>
    redactor.redactEmbedded(s) !== s || patterns.some(secret => s.includes(secret));
  const walk = (v: unknown): boolean =>
    typeof v === 'string'
      ? reflected(v)
      : Array.isArray(v)
        ? v.some(walk)
        : v && typeof v === 'object'
          ? Object.entries(v).some(([k, x]) => reflected(k) || walk(x))
          : false;
  if (walk(value))
    throw fail(
      'SoundCloud returned or received reflected authentication material. Reconnect and request the resource again.'
    );
}
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw fail(
      'SoundCloud returned an incomplete or unsupported native response. Check the resource before retrying a write.'
    );
  return result.data;
}
const nativeUser = z
  .object({
    urn: z.string().optional(),
    id: z.union([z.string(), count]).optional(),
    username: z.string(),
    full_name: text,
    description: text,
    permalink_url: text,
    avatar_url: text,
    city: text,
    country: text,
    country_code: text,
    followers_count: metric,
    followings_count: metric,
    track_count: metric,
    playlist_count: metric,
    likes_count: metric,
    public_favorites_count: metric,
    reposts_count: metric,
    verified: z.boolean().optional(),
    created_at: text,
    last_modified: text,
    email: text
  })
  .passthrough();
export const userSchema = nativeUser.transform(value => ({
  ...value,
  urn: nativeId(value, 'users')
}));
export const trackSchema = z
  .object({
    urn: z.string().optional(),
    id: z.union([z.string(), count]).optional(),
    title: z.string(),
    user: userSchema.nullable().optional(),
    description: text,
    permalink_url: text,
    uri: text,
    duration: metric,
    genre: text,
    tag_list: text,
    artwork_url: text,
    waveform_url: text,
    stream_url: text,
    download_url: text,
    playback_count: metric,
    likes_count: metric,
    favoritings_count: metric,
    reposts_count: metric,
    comment_count: metric,
    download_count: metric,
    created_at: text,
    last_modified: text,
    sharing: text,
    access: z.enum(['playable', 'preview', 'blocked']).nullable().optional(),
    state: text,
    streamable: z.boolean().optional(),
    downloadable: z.boolean().optional(),
    license: text,
    bpm: z.number().finite().nullable().optional(),
    isrc: text,
    metadata_artist: text
  })
  .passthrough()
  .transform(value => ({
    ...value,
    urn: nativeId(value, 'tracks'),
    likes_count: value.likes_count === undefined ? value.favoritings_count : value.likes_count
  }));
export const playlistSchema = z
  .object({
    urn: z.string().optional(),
    id: z.union([z.string(), count]).optional(),
    title: z.string(),
    user: userSchema.nullable().optional(),
    description: text,
    permalink_url: text,
    uri: text,
    duration: metric,
    artwork_url: text,
    genre: text,
    tag_list: text,
    track_count: metric,
    likes_count: metric,
    reposts_count: metric,
    created_at: text,
    last_modified: text,
    sharing: text,
    is_album: z.boolean().optional(),
    set_type: text,
    playlist_type: text,
    type: text,
    tracks: z.array(trackSchema).max(1000).optional(),
    tracks_uri: text
  })
  .passthrough()
  .transform(value => ({
    ...value,
    urn: nativeId(value, 'playlists'),
    is_album:
      value.is_album ??
      (value.set_type === 'album' ? true : value.set_type === 'playlist' ? false : undefined)
  }));
export const commentSchema = z
  .object({
    urn: z.string().optional(),
    id: z.union([z.string(), count]).optional(),
    body: z.string(),
    timestamp: z.union([z.number().finite(), z.string(), z.null()]).optional(),
    created_at: text,
    user: userSchema.nullable().optional(),
    user_urn: text,
    track_urn: text
  })
  .passthrough()
  .transform(value => {
    let timestamp = value.timestamp;
    if (typeof timestamp === 'string') {
      if (!timestamp.trim() || !Number.isFinite(Number(timestamp)))
        throw fail('SoundCloud returned an unsupported comment timestamp.');
      timestamp = Number(timestamp);
    }
    return { ...value, urn: nativeId(value, 'comments'), timestamp };
  });
function nativeId(
  value: { urn?: string; id?: string | number },
  kind: Parameters<typeof identifier>[1]
): string {
  if (value.urn) return identifier(value.urn, kind);
  if (value.id !== undefined) return identifier(String(value.id), kind);
  throw fail(
    `SoundCloud did not return the ${kind} URN. An accepted write may require manual reconciliation.`
  );
}
export function exact(
  actual: string,
  wanted: string,
  kind: Parameters<typeof identifier>[1]
): void {
  if (actual !== identifier(wanted, kind))
    throw fail(
      'SoundCloud returned a different resource identity. Preserve uncertain effects and reconcile manually.'
    );
}
export function submitted(
  actual: Record<string, unknown>,
  wanted: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(wanted))
    if (value !== undefined && JSON.stringify(actual[key]) !== JSON.stringify(value))
      throw fail(
        'SoundCloud did not confirm the requested supported fields. An accepted write may remain; read the exact resource before retrying.'
      );
}
export function publicUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw fail('Use a valid SoundCloud HTTPS permalink.');
  }
  if (
    url.protocol !== 'https:' ||
    !['soundcloud.com', 'www.soundcloud.com', 'on.soundcloud.com'].includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.hash
  )
    throw fail('Use a credential-free HTTPS soundcloud.com or on.soundcloud.com permalink.');
  return url.href;
}
export type SoundCloudUser = z.infer<typeof userSchema>;
export type SoundCloudTrack = z.infer<typeof trackSchema>;
export type SoundCloudPlaylist = z.infer<typeof playlistSchema>;
export type SoundCloudComment = z.infer<typeof commentSchema>;
