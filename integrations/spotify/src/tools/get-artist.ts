import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import { spec } from '../spec';

export let getArtist = SlateTool.create(spec, {
  name: 'Get Artist',
  key: 'get_artist',
  description: `Retrieve detailed information about an artist including their profile, top tracks, albums, and related artists. Combine multiple aspects of artist data in a single call by selecting what to include.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      artistId: z.string().describe('Spotify artist ID'),
      include: z
        .array(z.enum(['topTracks', 'albums', 'relatedArtists']))
        .optional()
        .describe('Additional data to include beyond basic artist info'),
      albumTypes: z
        .string()
        .optional()
        .describe(
          'Comma-separated album types to filter: album, single, appears_on, compilation'
        ),
      market: z.string().optional().describe('ISO 3166-1 alpha-2 country code'),
      albumLimit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Max albums to return (default 20)')
    })
  )
  .output(
    z.object({
      artistId: z.string(),
      name: z.string(),
      genres: z.array(z.string()),
      popularity: z.number(),
      followers: z.number(),
      imageUrl: z.string().nullable(),
      spotifyUrl: z.string(),
      uri: z.string(),
      topTracks: z
        .array(
          z.object({
            trackId: z.string(),
            name: z.string(),
            durationMs: z.number(),
            popularity: z.number(),
            albumName: z.string(),
            spotifyUrl: z.string(),
            uri: z.string()
          })
        )
        .optional(),
      albums: z
        .array(
          z.object({
            albumId: z.string(),
            name: z.string(),
            albumType: z.string(),
            totalTracks: z.number(),
            releaseDate: z.string(),
            imageUrl: z.string().nullable(),
            spotifyUrl: z.string()
          })
        )
        .optional(),
      relatedArtists: z
        .array(
          z.object({
            artistId: z.string(),
            name: z.string(),
            genres: z.array(z.string()),
            popularity: z.number(),
            imageUrl: z.string().nullable(),
            spotifyUrl: z.string()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpotifyClient({
      token: ctx.auth.token,
      market: ctx.config.market
    });

    let artist = await client.getArtist(ctx.input.artistId);
    let includes = ctx.input.include ?? [];

    let topTracksResult = includes.includes('topTracks')
      ? (await client.getArtistTopTracks(ctx.input.artistId, ctx.input.market)).tracks.map(
          t => ({
            trackId: t.id,
            name: t.name,
            durationMs: t.duration_ms,
            popularity: t.popularity,
            albumName: t.album.name,
            spotifyUrl: t.external_urls.spotify,
            uri: t.uri
          })
        )
      : undefined;

    let albumsResult = includes.includes('albums')
      ? (
          await client.getArtistAlbums(ctx.input.artistId, {
            includeGroups: ctx.input.albumTypes,
            market: ctx.input.market,
            limit: ctx.input.albumLimit
          })
        ).items.map(a => ({
          albumId: a.id,
          name: a.name,
          albumType: a.album_type,
          totalTracks: a.total_tracks,
          releaseDate: a.release_date,
          imageUrl: a.images?.[0]?.url ?? null,
          spotifyUrl: a.external_urls.spotify
        }))
      : undefined;

    let relatedArtistsResult = includes.includes('relatedArtists')
      ? (await client.getRelatedArtists(ctx.input.artistId)).artists.map(a => ({
          artistId: a.id,
          name: a.name,
          genres: a.genres,
          popularity: a.popularity,
          imageUrl: a.images?.[0]?.url ?? null,
          spotifyUrl: a.external_urls.spotify
        }))
      : undefined;

    return {
      output: {
        artistId: artist.id,
        name: artist.name,
        genres: artist.genres,
        popularity: artist.popularity,
        followers: artist.followers.total,
        imageUrl: artist.images?.[0]?.url ?? null,
        spotifyUrl: artist.external_urls.spotify,
        uri: artist.uri,
        topTracks: topTracksResult,
        albums: albumsResult,
        relatedArtists: relatedArtistsResult
      },
      message: `Retrieved artist **${artist.name}** (${artist.followers.total.toLocaleString()} followers, popularity ${artist.popularity}).`
    };
  });
