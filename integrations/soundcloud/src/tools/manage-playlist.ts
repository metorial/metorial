import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let playlistTrackSchema = z.object({
  trackId: z.string().describe('Track ID (URN)'),
  title: z.string().describe('Track title'),
  duration: z.number().describe('Duration in milliseconds'),
  username: z.string().describe('Uploader username')
});

export let getPlaylist = SlateTool.create(spec, {
  name: 'Get Playlist',
  key: 'get_playlist',
  description: `Retrieve detailed information about a SoundCloud playlist (set), including its tracks, metadata, and creator info.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      playlistId: z.string().describe('Playlist ID or URN')
    })
  )
  .output(
    z.object({
      playlistId: z.string().describe('Unique identifier (URN) of the playlist'),
      title: z.string().describe('Title of the playlist'),
      description: z.string().nullable().describe('Playlist description'),
      permalinkUrl: z.string().describe('URL to the playlist on SoundCloud'),
      duration: z.number().describe('Total duration in milliseconds'),
      trackCount: z.number().describe('Number of tracks'),
      likesCount: z.number().describe('Number of likes'),
      repostsCount: z.number().describe('Number of reposts'),
      isAlbum: z.boolean().describe('Whether marked as an album'),
      sharing: z.string().describe('Sharing setting'),
      createdAt: z.string().describe('When the playlist was created'),
      lastModified: z.string().describe('When the playlist was last modified'),
      username: z.string().describe('Creator username'),
      userId: z.string().describe('Creator user ID'),
      tracks: z.array(playlistTrackSchema).describe('Tracks in the playlist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let playlist = await client.getPlaylist(ctx.input.playlistId);

    let tracks = (playlist.tracks || []).map(t => ({
      trackId: t.urn || String(t.id),
      title: t.title,
      duration: t.duration,
      username: t.user?.username || ''
    }));

    return {
      output: {
        playlistId: playlist.urn || String(playlist.id),
        title: playlist.title,
        description: playlist.description,
        permalinkUrl: playlist.permalink_url,
        duration: playlist.duration,
        trackCount: playlist.track_count,
        likesCount: playlist.likes_count,
        repostsCount: playlist.reposts_count,
        isAlbum: playlist.is_album,
        sharing: playlist.sharing,
        createdAt: playlist.created_at,
        lastModified: playlist.last_modified,
        username: playlist.user?.username || '',
        userId: playlist.user?.urn || String(playlist.user?.id),
        tracks
      },
      message: `Retrieved playlist **"${playlist.title}"** with ${playlist.track_count} tracks.`
    };
  })
  .build();

export let createPlaylist = SlateTool.create(spec, {
  name: 'Create Playlist',
  key: 'create_playlist',
  description: `Create a new playlist (set) on SoundCloud. Optionally add tracks and mark as an album. Requires user-level OAuth authentication.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      title: z.string().describe('Title of the playlist'),
      description: z.string().optional().describe('Playlist description'),
      sharing: z
        .enum(['public', 'private'])
        .optional()
        .describe('Sharing setting (default: public)'),
      trackIds: z
        .array(z.string())
        .optional()
        .describe('Track IDs or URNs to include in the playlist'),
      isAlbum: z.boolean().optional().describe('Whether to mark as an album')
    })
  )
  .output(
    z.object({
      playlistId: z.string().describe('Unique identifier (URN) of the created playlist'),
      title: z.string().describe('Title'),
      permalinkUrl: z.string().describe('URL to the playlist on SoundCloud'),
      sharing: z.string().describe('Sharing setting'),
      trackCount: z.number().describe('Number of tracks'),
      createdAt: z.string().describe('When the playlist was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let playlist = await client.createPlaylist({
      title: ctx.input.title,
      description: ctx.input.description,
      sharing: ctx.input.sharing,
      trackIds: ctx.input.trackIds,
      isAlbum: ctx.input.isAlbum
    });

    return {
      output: {
        playlistId: playlist.urn || String(playlist.id),
        title: playlist.title,
        permalinkUrl: playlist.permalink_url,
        sharing: playlist.sharing,
        trackCount: playlist.track_count,
        createdAt: playlist.created_at
      },
      message: `Created playlist **"${playlist.title}"** with ${playlist.track_count} tracks. [View playlist](${playlist.permalink_url})`
    };
  })
  .build();

export let updatePlaylist = SlateTool.create(spec, {
  name: 'Update Playlist',
  key: 'update_playlist',
  description: `Update an existing SoundCloud playlist. You can change the title, description, sharing, album status, and set the complete list of tracks. When providing trackIds, the entire track list is replaced.`,
  instructions: [
    'When setting trackIds, provide the complete list of tracks you want in the playlist. This replaces all existing tracks.',
    'To add a track, first get the current playlist tracks and include them along with the new track ID.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      playlistId: z.string().describe('Playlist ID or URN to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      sharing: z.enum(['public', 'private']).optional().describe('Sharing setting'),
      trackIds: z
        .array(z.string())
        .optional()
        .describe('Complete list of track IDs/URNs (replaces existing tracks)'),
      isAlbum: z.boolean().optional().describe('Whether to mark as an album')
    })
  )
  .output(
    z.object({
      playlistId: z.string().describe('Unique identifier (URN) of the updated playlist'),
      title: z.string().describe('Updated title'),
      permalinkUrl: z.string().describe('URL to the playlist on SoundCloud'),
      sharing: z.string().describe('Sharing setting'),
      trackCount: z.number().describe('Number of tracks'),
      lastModified: z.string().describe('When the playlist was last modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let playlist = await client.updatePlaylist(ctx.input.playlistId, {
      title: ctx.input.title,
      description: ctx.input.description,
      sharing: ctx.input.sharing,
      trackIds: ctx.input.trackIds,
      isAlbum: ctx.input.isAlbum
    });

    return {
      output: {
        playlistId: playlist.urn || String(playlist.id),
        title: playlist.title,
        permalinkUrl: playlist.permalink_url,
        sharing: playlist.sharing,
        trackCount: playlist.track_count,
        lastModified: playlist.last_modified
      },
      message: `Updated playlist **"${playlist.title}"** successfully.`
    };
  })
  .build();

export let deletePlaylist = SlateTool.create(spec, {
  name: 'Delete Playlist',
  key: 'delete_playlist',
  description: `Permanently delete a playlist from SoundCloud. This action cannot be undone. Only the playlist owner can delete their playlists. Tracks within the playlist are not deleted.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      playlistId: z.string().describe('Playlist ID or URN to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the playlist was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deletePlaylist(ctx.input.playlistId);

    return {
      output: { deleted: true },
      message: `Playlist **${ctx.input.playlistId}** has been permanently deleted.`
    };
  })
  .build();
