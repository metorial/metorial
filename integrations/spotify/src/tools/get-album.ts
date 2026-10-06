import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import { paging, pagingOutputSchema } from '../lib/types';
import { spec } from '../spec';

export let getAlbum = SlateTool.create(spec, {
  name: 'Get Album',
  key: 'get_album',
  description: `Retrieve detailed information about an album including its metadata, one page of tracks, and artwork. Continue using tracksPaging and trackOffset. Also supports browsing new album releases.`,
  instructions: [
    'Use the "newReleases" action to browse recently released albums with confirmed legacy endpoint access instead of looking up a specific album.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'newReleases'])
        .describe('"get" to fetch a specific album, "newReleases" to browse new releases'),
      albumId: z.string().optional().describe('Spotify album ID (required for "get" action)'),
      market: z.string().optional().describe('ISO 3166-1 alpha-2 country code'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Max results for new releases (default 20)'),
      trackOffset: z
        .number()
        .min(0)
        .optional()
        .describe('Offset for album tracks when action is get'),
      trackLimit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Page size for album tracks when action is get'),
      offset: z.number().min(0).optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      album: z
        .object({
          albumId: z.string(),
          name: z.string(),
          albumType: z.string(),
          totalTracks: z.number(),
          releaseDate: z.string(),
          label: z.string().optional(),
          popularity: z.number().optional(),
          genres: z.array(z.string()).optional(),
          artists: z.array(
            z.object({
              artistId: z.string(),
              name: z.string()
            })
          ),
          tracks: z.array(
            z.object({
              trackId: z.string(),
              name: z.string(),
              trackNumber: z.number(),
              discNumber: z.number(),
              durationMs: z.number(),
              explicit: z.boolean(),
              artists: z.array(
                z.object({
                  artistId: z.string(),
                  name: z.string()
                })
              ),
              uri: z.string()
            })
          ),
          imageUrl: z.string().nullable(),
          spotifyUrl: z.string(),
          uri: z.string(),
          copyrights: z.array(z.object({ text: z.string(), type: z.string() })).optional()
        })
        .optional(),
      newReleases: z
        .array(
          z.object({
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
          })
        )
        .optional(),
      paging: pagingOutputSchema.optional(),
      tracksPaging: pagingOutputSchema.optional(),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpotifyClient({
      token: ctx.auth.token,
      refreshToken: ctx.auth.refreshToken,
      input: ctx.input,
      market: ctx.config.market,
      endpointCompatibility: ctx.config.endpointCompatibility
    });

    if (ctx.input.action === 'newReleases') {
      let result = await client.getNewReleases({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let releases = result.items.map(a => ({
        albumId: a.id,
        name: a.name,
        albumType: a.album_type,
        totalTracks: a.total_tracks,
        releaseDate: a.release_date,
        artists: a.artists.map(ar => ({ artistId: ar.id, name: ar.name })),
        imageUrl: a.images?.[0]?.url ?? null,
        spotifyUrl: a.external_urls.spotify
      }));

      return {
        output: {
          newReleases: releases,
          total: result.total,
          paging: paging(result)
        },
        message: `Found ${releases.length} new releases (${result.total} total).`
      };
    }

    if (!ctx.input.albumId) {
      throw createApiServiceError('albumId is required for "get" action');
    }

    let album = await client.getAlbum(ctx.input.albumId, ctx.input.market);

    const tracks =
      ctx.input.trackOffset !== undefined || ctx.input.trackLimit !== undefined
        ? await client.getAlbumTracks(ctx.input.albumId, {
            offset: ctx.input.trackOffset,
            limit: ctx.input.trackLimit,
            market: ctx.input.market
          })
        : album.tracks;
    let output = {
      tracksPaging: paging(tracks),
      album: {
        albumId: album.id,
        name: album.name,
        albumType: album.album_type,
        totalTracks: album.total_tracks,
        releaseDate: album.release_date,
        label: album.label,
        popularity: album.popularity,
        genres: album.genres,
        artists: album.artists.map(a => ({ artistId: a.id, name: a.name })),
        tracks: tracks.items.map(t => ({
          trackId: t.id,
          name: t.name,
          trackNumber: t.track_number,
          discNumber: t.disc_number,
          durationMs: t.duration_ms,
          explicit: t.explicit,
          artists: t.artists.map(a => ({ artistId: a.id, name: a.name })),
          uri: t.uri
        })),
        imageUrl: album.images?.[0]?.url ?? null,
        spotifyUrl: album.external_urls.spotify,
        uri: album.uri,
        copyrights: album.copyrights
      }
    };

    return {
      output,
      message: `Retrieved album **${album.name}** by ${album.artists.map(a => a.name).join(', ')} (${album.total_tracks} tracks, released ${album.release_date}).`
    };
  });
