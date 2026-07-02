import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import { spec } from '../spec';

export let manageLibrary = SlateTool.create(spec, {
  name: 'Manage Library',
  key: 'manage_library',
  description: `Manage the user's Spotify library ("Your Music"). Save or remove tracks and albums, check if specific items are already saved, and list saved items with pagination.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'getSavedTracks',
          'getSavedAlbums',
          'saveTracks',
          'saveAlbums',
          'removeTracks',
          'removeAlbums',
          'checkTracks',
          'checkAlbums'
        ])
        .describe('Library operation to perform'),
      trackIds: z
        .array(z.string())
        .optional()
        .describe('Spotify track IDs (for save, remove, or check operations)'),
      albumIds: z
        .array(z.string())
        .optional()
        .describe('Spotify album IDs (for save, remove, or check operations)'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Max results per page (default 20)'),
      offset: z.number().min(0).optional().describe('Offset for pagination'),
      market: z.string().optional().describe('ISO 3166-1 alpha-2 country code')
    })
  )
  .output(
    z.object({
      savedTracks: z
        .array(
          z.object({
            addedAt: z.string(),
            trackId: z.string(),
            name: z.string(),
            artists: z.array(
              z.object({
                artistId: z.string(),
                name: z.string()
              })
            ),
            albumName: z.string(),
            durationMs: z.number(),
            spotifyUrl: z.string(),
            uri: z.string()
          })
        )
        .optional(),
      savedAlbums: z
        .array(
          z.object({
            addedAt: z.string(),
            albumId: z.string(),
            name: z.string(),
            artists: z.array(
              z.object({
                artistId: z.string(),
                name: z.string()
              })
            ),
            totalTracks: z.number(),
            releaseDate: z.string(),
            imageUrl: z.string().nullable(),
            spotifyUrl: z.string()
          })
        )
        .optional(),
      checkResults: z
        .array(
          z.object({
            itemId: z.string(),
            isSaved: z.boolean()
          })
        )
        .optional(),
      total: z.number().optional(),
      success: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpotifyClient({
      token: ctx.auth.token,
      market: ctx.config.market
    });

    let { action } = ctx.input;

    if (action === 'getSavedTracks') {
      let result = await client.getSavedTracks({
        market: ctx.input.market,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let savedTracks = result.items.map(item => ({
        addedAt: item.added_at,
        trackId: item.track.id,
        name: item.track.name,
        artists: item.track.artists.map(a => ({ artistId: a.id, name: a.name })),
        albumName: item.track.album.name,
        durationMs: item.track.duration_ms,
        spotifyUrl: item.track.external_urls.spotify,
        uri: item.track.uri
      }));

      return {
        output: { savedTracks, total: result.total },
        message: `Retrieved ${savedTracks.length} saved tracks (${result.total} total).`
      };
    }

    if (action === 'getSavedAlbums') {
      let result = await client.getSavedAlbums({
        market: ctx.input.market,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let savedAlbums = result.items.map(item => ({
        addedAt: item.added_at,
        albumId: item.album.id,
        name: item.album.name,
        artists: item.album.artists.map(a => ({ artistId: a.id, name: a.name })),
        totalTracks: item.album.total_tracks,
        releaseDate: item.album.release_date,
        imageUrl: item.album.images?.[0]?.url ?? null,
        spotifyUrl: item.album.external_urls.spotify
      }));

      return {
        output: { savedAlbums, total: result.total },
        message: `Retrieved ${savedAlbums.length} saved albums (${result.total} total).`
      };
    }

    if (action === 'saveTracks') {
      if (!ctx.input.trackIds || ctx.input.trackIds.length === 0)
        throw new Error('trackIds is required for "saveTracks" action');
      await client.saveTracks(ctx.input.trackIds);
      return {
        output: { success: true },
        message: `Saved ${ctx.input.trackIds.length} track(s) to library.`
      };
    }

    if (action === 'saveAlbums') {
      if (!ctx.input.albumIds || ctx.input.albumIds.length === 0)
        throw new Error('albumIds is required for "saveAlbums" action');
      await client.saveAlbums(ctx.input.albumIds);
      return {
        output: { success: true },
        message: `Saved ${ctx.input.albumIds.length} album(s) to library.`
      };
    }

    if (action === 'removeTracks') {
      if (!ctx.input.trackIds || ctx.input.trackIds.length === 0)
        throw new Error('trackIds is required for "removeTracks" action');
      await client.removeSavedTracks(ctx.input.trackIds);
      return {
        output: { success: true },
        message: `Removed ${ctx.input.trackIds.length} track(s) from library.`
      };
    }

    if (action === 'removeAlbums') {
      if (!ctx.input.albumIds || ctx.input.albumIds.length === 0)
        throw new Error('albumIds is required for "removeAlbums" action');
      await client.removeSavedAlbums(ctx.input.albumIds);
      return {
        output: { success: true },
        message: `Removed ${ctx.input.albumIds.length} album(s) from library.`
      };
    }

    if (action === 'checkTracks') {
      if (!ctx.input.trackIds || ctx.input.trackIds.length === 0)
        throw new Error('trackIds is required for "checkTracks" action');
      let results = await client.checkSavedTracks(ctx.input.trackIds);
      let checkResults = ctx.input.trackIds.map((id, i) => ({
        itemId: id,
        isSaved: results[i] ?? false
      }));
      return {
        output: { checkResults },
        message: `Checked ${checkResults.length} track(s): ${checkResults.filter(r => r.isSaved).length} saved.`
      };
    }

    if (action === 'checkAlbums') {
      if (!ctx.input.albumIds || ctx.input.albumIds.length === 0)
        throw new Error('albumIds is required for "checkAlbums" action');
      let results = await client.checkSavedAlbums(ctx.input.albumIds);
      let checkResults = ctx.input.albumIds.map((id, i) => ({
        itemId: id,
        isSaved: results[i] ?? false
      }));
      return {
        output: { checkResults },
        message: `Checked ${checkResults.length} album(s): ${checkResults.filter(r => r.isSaved).length} saved.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
