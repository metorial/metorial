import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { API_ROOT } from './validation';

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const external = z.object({ spotify: z.string() });
const images = z.array(
  z.object({
    url: z.string(),
    height: count.nullable().optional(),
    width: count.nullable().optional()
  })
);
const followers = z.object({ href: z.string().nullable().optional(), total: count });
export const miniArtist = z.object({
  id: z.string(),
  name: z.string(),
  uri: z.string().optional(),
  external_urls: external.optional(),
  type: z.literal('artist').optional()
});
export const artistSchema = miniArtist.extend({
  uri: z.string(),
  external_urls: external,
  genres: z.array(z.string()).optional(),
  images: images.optional(),
  popularity: count.max(100).optional(),
  followers: followers.optional()
});
export const albumSchema = z.object({
  id: z.string(),
  name: z.string(),
  album_type: z.string(),
  total_tracks: count,
  release_date: z.string(),
  release_date_precision: z.string().optional(),
  images,
  artists: z.array(miniArtist),
  external_urls: external,
  uri: z.string(),
  type: z.literal('album').optional()
});
export const trackSchema = z.object({
  id: z.string(),
  name: z.string(),
  track_number: count,
  disc_number: count,
  duration_ms: count,
  explicit: z.boolean(),
  artists: z.array(miniArtist),
  external_urls: external,
  uri: z.string(),
  type: z.literal('track').optional(),
  preview_url: z.string().nullable().optional(),
  is_local: z.boolean().optional(),
  popularity: count.max(100).optional()
});
export const fullTrackSchema = trackSchema.extend({
  album: albumSchema,
  linked_from: z.object({ id: z.string(), uri: z.string().optional() }).optional()
});
export const userSchema = z.object({
  id: z.string(),
  account_id: z.string().optional(),
  display_name: z.string().nullable().optional(),
  external_urls: external,
  uri: z.string(),
  type: z.literal('user').optional(),
  followers: followers.optional(),
  images: images.optional(),
  email: z.string().optional(),
  product: z.string().optional(),
  country: z.string().optional()
});
const pageBase = z.object({
  href: z.string(),
  limit: count,
  next: z.string().nullable(),
  offset: count,
  previous: z.string().nullable(),
  total: count
});
export const pageSchema = <T extends z.ZodType>(item: T) =>
  pageBase.extend({ items: z.array(item) });
export const cursorSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    href: z.string(),
    items: z.array(item),
    limit: count,
    next: z.string().nullable(),
    cursors: z.object({
      after: z.string().nullable(),
      before: z.string().nullable().optional()
    }),
    total: count.optional()
  });
export const fullAlbumSchema = albumSchema.extend({
  tracks: pageSchema(trackSchema),
  genres: z.array(z.string()).optional(),
  label: z.string().optional(),
  popularity: count.max(100).optional(),
  copyrights: z.array(z.object({ text: z.string(), type: z.string() })).optional()
});
export const playableSchema = z.object({
  id: z.string().nullable().optional(),
  name: z.string(),
  type: z.string(),
  uri: z.string(),
  duration_ms: count,
  external_urls: external.optional(),
  artists: z
    .array(z.object({ id: z.string().nullable().optional(), name: z.string() }))
    .optional(),
  album: z.object({ name: z.string() }).optional(),
  show: z.object({ name: z.string() }).optional(),
  is_local: z.boolean().optional()
});
export const playlistEntrySchema = z.object({
  added_at: z.string().nullable().optional(),
  added_by: z.object({ id: z.string() }).nullable().optional(),
  is_local: z.boolean().optional(),
  track: playableSchema.nullable().optional(),
  item: playableSchema.nullable().optional()
});
const playlistBase = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  public: z.boolean().nullable(),
  collaborative: z.boolean(),
  owner: userSchema,
  images: images.nullable().optional(),
  external_urls: external,
  uri: z.string(),
  snapshot_id: z.string(),
  followers: followers.optional(),
  type: z.literal('playlist').optional()
});
export const playlistSchema = playlistBase.extend({
  tracks: pageSchema(playlistEntrySchema).nullable().optional(),
  items: pageSchema(playlistEntrySchema).nullable().optional()
});
export const simplifiedPlaylistSchema = playlistBase.extend({
  tracks: z.object({ href: z.string().optional(), total: count }).nullable().optional(),
  items: z.object({ href: z.string().optional(), total: count }).nullable().optional()
});
export const deviceSchema = z.object({
  id: z.string().nullable(),
  is_active: z.boolean(),
  is_private_session: z.boolean().optional(),
  is_restricted: z.boolean().optional(),
  name: z.string(),
  type: z.string(),
  volume_percent: count.max(100).nullable(),
  supports_volume: z.boolean().optional()
});
const contextSchema = z.object({
  type: z.string(),
  uri: z.string(),
  href: z.string().optional(),
  external_urls: external.optional()
});
export const playbackSchema = z.object({
  device: deviceSchema.optional(),
  repeat_state: z.string().optional(),
  shuffle_state: z.boolean().optional(),
  timestamp: count,
  progress_ms: count.nullable(),
  is_playing: z.boolean(),
  item: playableSchema.nullable(),
  currently_playing_type: z.string(),
  context: contextSchema.nullable()
});
export const queueSchema = z.object({
  currently_playing: playableSchema.nullable(),
  queue: z.array(playableSchema)
});
export const historySchema = z.object({
  track: fullTrackSchema,
  played_at: z.string(),
  context: contextSchema.nullable()
});
export const savedTrackSchema = z.object({
  added_at: z.string(),
  track: fullTrackSchema.nullable()
});
export const savedAlbumSchema = z.object({
  added_at: z.string(),
  album: fullAlbumSchema.nullable()
});
export const audioSchema = z.object({
  id: z.string(),
  danceability: z.number(),
  energy: z.number(),
  key: z.number(),
  loudness: z.number(),
  mode: z.number(),
  speechiness: z.number(),
  acousticness: z.number(),
  instrumentalness: z.number(),
  liveness: z.number(),
  valence: z.number(),
  tempo: z.number(),
  time_signature: z.number()
});
export type SpotifyArtist = z.infer<typeof artistSchema>;
export type SimplifiedAlbum = z.infer<typeof albumSchema>;
export type SpotifyAlbum = z.infer<typeof fullAlbumSchema>;
export type SpotifyTrack = z.infer<typeof fullTrackSchema>;
export type SpotifyPlaylist = z.infer<typeof playlistSchema>;
export type SimplifiedPlaylist = z.infer<typeof simplifiedPlaylistSchema>;
export type SpotifyUser = z.infer<typeof userSchema>;
export type SpotifyDevice = z.infer<typeof deviceSchema>;
export type SpotifyPlaybackState = z.infer<typeof playbackSchema>;
export type SpotifyQueue = z.infer<typeof queueSchema>;
export type PlayHistoryItem = z.infer<typeof historySchema>;
export type SpotifySavedTrack = z.infer<typeof savedTrackSchema>;
export type SpotifySavedAlbum = z.infer<typeof savedAlbumSchema>;
export type SpotifyAudioFeatures = z.infer<typeof audioSchema>;
export type SpotifyPaginated<T> = z.infer<typeof pageBase> & { items: T[] };
export type SpotifyCursorPaginated<T> = {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  cursors: { after: string | null; before?: string | null };
  total?: number;
};
export type SpotifySearchResult = {
  tracks?: SpotifyPaginated<SpotifyTrack | null>;
  artists?: SpotifyPaginated<SpotifyArtist | null>;
  albums?: SpotifyPaginated<SimplifiedAlbum | null>;
  playlists?: SpotifyPaginated<SimplifiedPlaylist | null>;
};
export function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(
      'Spotify returned an incomplete or invalid native response. No missing state was assumed.'
    );
  return result.data;
}
export function validatePageLinks(
  page: { href: string; next: string | null; previous?: string | null },
  path: string
) {
  for (const value of [page.href, page.next, page.previous])
    if (value) {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        throw createApiServiceError('Spotify returned an invalid page URL.');
      }
      if (
        url.origin !== 'https://api.spotify.com' ||
        url.username ||
        url.password ||
        url.hash ||
        url.pathname !== new URL(`${API_ROOT}${path}`).pathname
      )
        throw createApiServiceError(
          'Spotify returned paging metadata for a different endpoint.'
        );
    }
}
export const pagingOutputSchema = z.object({
  limit: count,
  offset: count.optional(),
  total: count.optional(),
  next: z.string().nullable(),
  previous: z.string().nullable().optional(),
  hasMore: z.boolean(),
  nextOffset: count.optional()
});
export function paging(page: {
  limit: number;
  offset?: number;
  total?: number;
  next: string | null;
  previous?: string | null;
}) {
  const nextOffset = page.next ? new URL(page.next).searchParams.get('offset') : null;
  return {
    limit: page.limit,
    offset: page.offset,
    total: page.total,
    next: page.next,
    previous: page.previous,
    hasMore: page.next !== null,
    nextOffset:
      nextOffset !== null &&
      /^\d+$/.test(nextOffset) &&
      Number.isSafeInteger(Number(nextOffset))
        ? Number(nextOffset)
        : undefined
  };
}
