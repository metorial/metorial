import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import { spec } from '../spec';

let simplifiedArtistSchema = z.object({
  artistId: z.string(),
  name: z.string(),
  genres: z.array(z.string()),
  popularity: z.number(),
  imageUrl: z.string().nullable(),
  spotifyUrl: z.string(),
  followers: z.number()
});

let simplifiedAlbumSchema = z.object({
  albumId: z.string(),
  name: z.string(),
  albumType: z.string(),
  totalTracks: z.number(),
  releaseDate: z.string(),
  artists: z.array(
    z.object({
      artistId: z.string(),
      name: z.string()
    })
  ),
  imageUrl: z.string().nullable(),
  spotifyUrl: z.string()
});

let simplifiedTrackSchema = z.object({
  trackId: z.string(),
  name: z.string(),
  durationMs: z.number(),
  explicit: z.boolean(),
  popularity: z.number(),
  artists: z.array(
    z.object({
      artistId: z.string(),
      name: z.string()
    })
  ),
  album: z.object({
    albumId: z.string(),
    name: z.string()
  }),
  spotifyUrl: z.string(),
  previewUrl: z.string().nullable(),
  uri: z.string()
});

let simplifiedPlaylistSchema = z.object({
  playlistId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isPublic: z.boolean().nullable(),
  totalTracks: z.number(),
  ownerName: z.string().nullable(),
  imageUrl: z.string().nullable(),
  spotifyUrl: z.string()
});

export let searchCatalog = SlateTool.create(spec, {
  name: 'Search Catalog',
  key: 'search_catalog',
  description: `Search across Spotify's catalog for tracks, artists, albums, and playlists using keyword queries. Results can be filtered by content type and market. Useful for finding specific music content or discovering new items matching a search term.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query (keywords, artist name, track name, etc.)'),
      types: z
        .array(z.enum(['track', 'artist', 'album', 'playlist']))
        .describe('Content types to search for'),
      market: z
        .string()
        .optional()
        .describe('ISO 3166-1 alpha-2 country code to filter results'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of results per type (default 20, max 50)'),
      offset: z.number().min(0).optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      tracks: z.array(simplifiedTrackSchema).optional(),
      artists: z.array(simplifiedArtistSchema).optional(),
      albums: z.array(simplifiedAlbumSchema).optional(),
      playlists: z.array(simplifiedPlaylistSchema).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpotifyClient({
      token: ctx.auth.token,
      market: ctx.config.market
    });

    let result = await client.search({
      query: ctx.input.query,
      types: ctx.input.types,
      market: ctx.input.market,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let output: Record<string, any> = {};

    if (result.tracks) {
      output.tracks = result.tracks.items.map(t => ({
        trackId: t.id,
        name: t.name,
        durationMs: t.duration_ms,
        explicit: t.explicit,
        popularity: t.popularity,
        artists: t.artists.map(a => ({ artistId: a.id, name: a.name })),
        album: { albumId: t.album.id, name: t.album.name },
        spotifyUrl: t.external_urls.spotify,
        previewUrl: t.preview_url,
        uri: t.uri
      }));
    }

    if (result.artists) {
      output.artists = result.artists.items.map(a => ({
        artistId: a.id,
        name: a.name,
        genres: a.genres,
        popularity: a.popularity,
        imageUrl: a.images?.[0]?.url ?? null,
        spotifyUrl: a.external_urls.spotify,
        followers: a.followers.total
      }));
    }

    if (result.albums) {
      output.albums = result.albums.items.map(a => ({
        albumId: a.id,
        name: a.name,
        albumType: a.album_type,
        totalTracks: a.total_tracks,
        releaseDate: a.release_date,
        artists: a.artists.map(ar => ({ artistId: ar.id, name: ar.name })),
        imageUrl: a.images?.[0]?.url ?? null,
        spotifyUrl: a.external_urls.spotify
      }));
    }

    if (result.playlists) {
      output.playlists = result.playlists.items.map(p => ({
        playlistId: p.id,
        name: p.name,
        description: p.description,
        isPublic: p.public,
        totalTracks: p.tracks.total,
        ownerName: p.owner.display_name,
        imageUrl: p.images?.[0]?.url ?? null,
        spotifyUrl: p.external_urls.spotify
      }));
    }

    let counts = ctx.input.types
      .map(t => {
        let key =
          t === 'track'
            ? 'tracks'
            : t === 'artist'
              ? 'artists'
              : t === 'album'
                ? 'albums'
                : 'playlists';
        let items = output[key];
        return `${items?.length ?? 0} ${key}`;
      })
      .join(', ');

    return {
      output,
      message: `Found ${counts} for query "${ctx.input.query}".`
    };
  });
