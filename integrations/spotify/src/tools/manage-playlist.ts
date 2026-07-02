import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import { spec } from '../spec';

export let managePlaylist = SlateTool.create(spec, {
  name: 'Manage Playlist',
  key: 'manage_playlist',
  description: `Create, update, and manage Spotify playlists. Supports creating new playlists, updating playlist details (name, description, visibility), adding or removing tracks, reordering items, and retrieving playlist contents. Also allows listing all of the current user's playlists.`,
  instructions: [
    'Use action "list" to get all playlists for the current user.',
    'Use action "get" to retrieve full playlist details including tracks.',
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
            totalTracks: z.number(),
            ownerName: z.string().nullable(),
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
          followers: z.number(),
          ownerName: z.string().nullable(),
          imageUrl: z.string().nullable(),
          spotifyUrl: z.string(),
          uri: z.string(),
          snapshotId: z.string(),
          tracks: z.array(
            z.object({
              trackId: z.string().nullable(),
              name: z.string().nullable(),
              artists: z
                .array(
                  z.object({
                    artistId: z.string(),
                    name: z.string()
                  })
                )
                .nullable(),
              durationMs: z.number().nullable(),
              addedAt: z.string(),
              addedBy: z.string(),
              uri: z.string().nullable()
            })
          ),
          totalTracks: z.number()
        })
        .optional(),
      snapshotId: z.string().optional(),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpotifyClient({
      token: ctx.auth.token,
      market: ctx.config.market
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
        totalTracks: p.tracks.total,
        ownerName: p.owner.display_name,
        imageUrl: p.images?.[0]?.url ?? null,
        spotifyUrl: p.external_urls.spotify
      }));

      return {
        output: { playlists, total: result.total },
        message: `Found ${playlists.length} playlists (${result.total} total).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.playlistId) throw new Error('playlistId is required for "get" action');

      let playlist = await client.getPlaylist(ctx.input.playlistId, {
        market: ctx.input.market
      });

      return {
        output: {
          playlist: {
            playlistId: playlist.id,
            name: playlist.name,
            description: playlist.description,
            isPublic: playlist.public,
            collaborative: playlist.collaborative,
            followers: playlist.followers.total,
            ownerName: playlist.owner.display_name,
            imageUrl: playlist.images?.[0]?.url ?? null,
            spotifyUrl: playlist.external_urls.spotify,
            uri: playlist.uri,
            snapshotId: playlist.snapshot_id,
            tracks: playlist.tracks.items.map(item => ({
              trackId: item.track?.id ?? null,
              name: item.track?.name ?? null,
              artists:
                item.track?.artists.map(a => ({ artistId: a.id, name: a.name })) ?? null,
              durationMs: item.track?.duration_ms ?? null,
              addedAt: item.added_at,
              addedBy: item.added_by.id,
              uri: item.track?.uri ?? null
            })),
            totalTracks: playlist.tracks.total
          }
        },
        message: `Retrieved playlist **${playlist.name}** (${playlist.tracks.total} tracks).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for "create" action');

      let user = await client.getCurrentUser();
      let playlist = await client.createPlaylist(user.id, {
        name: ctx.input.name,
        description: ctx.input.description,
        public: ctx.input.isPublic,
        collaborative: ctx.input.collaborative
      });

      return {
        output: {
          playlist: {
            playlistId: playlist.id,
            name: playlist.name,
            description: playlist.description,
            isPublic: playlist.public,
            collaborative: playlist.collaborative,
            followers: playlist.followers.total,
            ownerName: playlist.owner.display_name,
            imageUrl: playlist.images?.[0]?.url ?? null,
            spotifyUrl: playlist.external_urls.spotify,
            uri: playlist.uri,
            snapshotId: playlist.snapshot_id,
            tracks: [],
            totalTracks: 0
          }
        },
        message: `Created playlist **${playlist.name}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.playlistId) throw new Error('playlistId is required for "update" action');

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
        throw new Error('playlistId is required for "addItems" action');
      if (!ctx.input.uris || ctx.input.uris.length === 0)
        throw new Error('uris is required for "addItems" action');

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
        throw new Error('playlistId is required for "removeItems" action');
      if (!ctx.input.uris || ctx.input.uris.length === 0)
        throw new Error('uris is required for "removeItems" action');

      let result = await client.removeItemsFromPlaylist(ctx.input.playlistId, ctx.input.uris);

      return {
        output: { snapshotId: result.snapshot_id },
        message: `Removed ${ctx.input.uris.length} item(s) from the playlist.`
      };
    }

    if (action === 'reorder') {
      if (!ctx.input.playlistId)
        throw new Error('playlistId is required for "reorder" action');
      if (ctx.input.rangeStart === undefined)
        throw new Error('rangeStart is required for "reorder" action');
      if (ctx.input.insertBefore === undefined)
        throw new Error('insertBefore is required for "reorder" action');

      let result = await client.reorderPlaylistItems(
        ctx.input.playlistId,
        ctx.input.rangeStart,
        ctx.input.insertBefore,
        ctx.input.rangeLength
      );

      return {
        output: { snapshotId: result.snapshot_id },
        message: `Reordered playlist items.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
