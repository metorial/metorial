import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import { paging, pagingOutputSchema, type SpotifyPlaylist } from '../lib/types';
import { spec } from '../spec';

export let managePlaylist = SlateTool.create(spec, {
  name: 'Manage Playlist',
  key: 'manage_playlist',
  description: `Create, update, and manage Spotify playlists. Supports creating new playlists, updating playlist details (name, description, visibility), adding or removing tracks, reordering items, and retrieving playlist contents. Also allows listing all of the current user's playlists.`,
  instructions: [
    'Use action "list" to get one page of playlists for the current user.',
    'Use action "get" to retrieve playlist metadata and one page of available items.',
    'Use action "create" to create a new playlist — requires a name.',
    'Use action "update" to change playlist name, description, or visibility.',
    'Use action "addItems" to add tracks/episodes by their Spotify URIs.',
    'Use action "removeItems" to remove tracks/episodes by their Spotify URIs.',
    'Use action "reorder" to move items within the playlist.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'addItems', 'removeItems', 'reorder'])
        .describe('Playlist operation to perform'),
      playlistId: z
        .string()
        .optional()
        .describe(
          'Spotify playlist ID (required for get, update, addItems, removeItems, reorder)'
        ),
      name: z
        .string()
        .optional()
        .describe('Playlist name (required for create, optional for update)'),
      description: z.string().optional().describe('Playlist description'),
      isPublic: z.boolean().optional().describe('Whether the playlist is public'),
      collaborative: z.boolean().optional().describe('Whether the playlist is collaborative'),
      uris: z
        .array(z.string())
        .optional()
        .describe('Spotify URIs to add or remove (e.g., spotify:track:xxx)'),
      snapshotId: z
        .string()
        .optional()
        .describe('Native playlist snapshot for removeItems or reorder'),
      position: z.number().optional().describe('Position to insert items for addItems action'),
      rangeStart: z.number().optional().describe('Start index for reorder'),
      insertBefore: z.number().optional().describe('Target index for reorder'),
      rangeLength: z.number().optional().describe('Number of items to reorder (default 1)'),
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
      playlists: z
        .array(
          z.object({
            playlistId: z.string(),
            name: z.string(),
            description: z.string().nullable(),
            isPublic: z.boolean().nullable(),
            collaborative: z.boolean(),
            totalTracks: z.number().optional(),
            ownerName: z.string().nullable().optional(),
            imageUrl: z.string().nullable(),
            spotifyUrl: z.string()
          })
        )
        .optional(),
      playlist: z
        .object({
          playlistId: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          isPublic: z.boolean().nullable(),
          collaborative: z.boolean(),
          followers: z.number().optional(),
          ownerName: z.string().nullable().optional(),
          imageUrl: z.string().nullable(),
          spotifyUrl: z.string(),
          uri: z.string(),
          snapshotId: z.string(),
          contentsAvailable: z.boolean(),
          itemsPaging: pagingOutputSchema.optional(),
          tracks: z
            .array(
              z.object({
                trackId: z.string().nullable(),
                name: z.string().nullable(),
                artists: z
                  .array(
                    z.object({
                      artistId: z.string().nullable(),
                      name: z.string()
                    })
                  )
                  .nullable(),
                durationMs: z.number().nullable(),
                itemType: z.string().optional(),
                episodeId: z.string().nullable().optional(),
                addedAt: z.string().nullable().optional(),
                addedBy: z.string().nullable().optional(),
                uri: z.string().nullable()
              })
            )
            .optional(),
          totalTracks: z.number().optional()
        })
        .optional(),
      snapshotId: z.string().optional(),
      paging: pagingOutputSchema.optional(),
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

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.getCurrentUserPlaylists({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let playlists = result.items.map(p => ({
        playlistId: p.id,
        name: p.name,
        description: p.description,
        isPublic: p.public,
        collaborative: p.collaborative,
        totalTracks: (p.items !== undefined ? p.items : p.tracks)?.total,
        ownerName: p.owner.display_name,
        imageUrl: p.images?.[0]?.url ?? null,
        spotifyUrl: p.external_urls.spotify
      }));

      return {
        output: { playlists, total: result.total, paging: paging(result) },
        message: `Found ${playlists.length} playlists (${result.total} total).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.playlistId)
        throw createApiServiceError('playlistId is required for "get" action');

      let playlist = await client.getPlaylist(ctx.input.playlistId, {
        market: ctx.input.market
      });

      if (ctx.input.limit !== undefined || ctx.input.offset !== undefined) {
        const items = await client.getPlaylistTracks(ctx.input.playlistId, {
          limit: ctx.input.limit,
          offset: ctx.input.offset,
          market: ctx.input.market
        });
        if (client.legacy) playlist.tracks = items;
        else playlist.items = items;
      }
      return {
        output: { playlist: mapPlaylist(playlist) },
        message: `Retrieved playlist **${playlist.name}**. Contents, when available, contain one page; use itemsPaging and offset to continue.`
      };
    }
    if (action === 'create') {
      if (!ctx.input.name) throw createApiServiceError('name is required for "create" action');
      if (!ctx.input.name.trim())
        throw createApiServiceError('Supply a nonempty playlist name.');
      if (ctx.input.collaborative && ctx.input.isPublic !== false)
        throw createApiServiceError('A collaborative playlist must explicitly be private.');
      const user = await client.getCurrentUser();
      const playlist = await client.createPlaylist(user.id, {
        name: ctx.input.name,
        description: ctx.input.description,
        public: ctx.input.isPublic,
        collaborative: ctx.input.collaborative
      });
      return {
        output: { playlist: mapPlaylist(playlist) },
        message: `Spotify created playlist **${playlist.name}**. Its history may remain after unfollowing.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.playlistId)
        throw createApiServiceError('playlistId is required for "update" action');

      await client.updatePlaylistDetails(ctx.input.playlistId, {
        name: ctx.input.name,
        description: ctx.input.description,
        public: ctx.input.isPublic,
        collaborative: ctx.input.collaborative
      });

      return {
        output: {},
        message: `Updated playlist details.`
      };
    }

    if (action === 'addItems') {
      if (!ctx.input.playlistId)
        throw createApiServiceError('playlistId is required for "addItems" action');
      if (!ctx.input.uris || ctx.input.uris.length === 0)
        throw createApiServiceError('uris is required for "addItems" action');

      let result = await client.addItemsToPlaylist(
        ctx.input.playlistId,
        ctx.input.uris,
        ctx.input.position
      );

      return {
        output: { snapshotId: result.snapshot_id },
        message: `Added ${ctx.input.uris.length} item(s) to the playlist.`
      };
    }

    if (action === 'removeItems') {
      if (!ctx.input.playlistId)
        throw createApiServiceError('playlistId is required for "removeItems" action');
      if (!ctx.input.uris || ctx.input.uris.length === 0)
        throw createApiServiceError('uris is required for "removeItems" action');

      let result = await client.removeItemsFromPlaylist(
        ctx.input.playlistId,
        ctx.input.uris,
        ctx.input.snapshotId
      );

      return {
        output: { snapshotId: result.snapshot_id },
        message: `Removed ${ctx.input.uris.length} item(s) from the playlist.`
      };
    }

    if (action === 'reorder') {
      if (!ctx.input.playlistId)
        throw createApiServiceError('playlistId is required for "reorder" action');
      if (ctx.input.rangeStart === undefined)
        throw createApiServiceError('rangeStart is required for "reorder" action');
      if (ctx.input.insertBefore === undefined)
        throw createApiServiceError('insertBefore is required for "reorder" action');

      let result = await client.reorderPlaylistItems(
        ctx.input.playlistId,
        ctx.input.rangeStart,
        ctx.input.insertBefore,
        ctx.input.rangeLength,
        ctx.input.snapshotId
      );

      return {
        output: { snapshotId: result.snapshot_id },
        message: `Reordered playlist items.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  });

function mapPlaylist(playlist: SpotifyPlaylist) {
  const items = playlist.items !== undefined ? playlist.items : playlist.tracks;
  return {
    playlistId: playlist.id,
    name: playlist.name,
    description: playlist.description,
    isPublic: playlist.public,
    collaborative: playlist.collaborative,
    followers: playlist.followers?.total,
    ownerName: playlist.owner.display_name,
    imageUrl: playlist.images?.[0]?.url ?? null,
    spotifyUrl: playlist.external_urls.spotify,
    uri: playlist.uri,
    snapshotId: playlist.snapshot_id,
    contentsAvailable: items !== undefined && items !== null,
    itemsPaging: items ? paging(items) : undefined,
    totalTracks: items?.total,
    tracks: items?.items.map(entry => {
      const item = entry.item !== undefined ? entry.item : entry.track;
      return {
        trackId: item?.type === 'track' ? (item.id ?? null) : null,
        episodeId: item?.type === 'episode' ? (item.id ?? null) : undefined,
        itemType: item?.type,
        name: item?.name ?? null,
        artists: item?.artists?.map(a => ({ artistId: a.id ?? null, name: a.name })) ?? null,
        durationMs: item?.duration_ms ?? null,
        addedAt: entry.added_at,
        addedBy: entry.added_by === null ? null : entry.added_by?.id,
        uri: item?.uri ?? null
      };
    })
  };
}
