import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeServiceError } from '../lib/errors';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

export let managePlaylistItems = SlateTool.create(spec, {
  name: 'Manage Playlist Items',
  key: 'manage_playlist_items',
  description: `Add, reorder, or remove videos from a YouTube playlist. Use "add" to insert a video, "update" to change position, "remove" to delete an item, or "list" to view playlist contents.`,
  instructions: [
    'For listing items: set action to "list" and provide playlistId.',
    'For adding a video: set action to "add" with playlistId and videoId.',
    'For reordering: set action to "update" with playlistItemId, playlistId, videoId, and new position.',
    'For removing: set action to "remove" with playlistItemId.'
  ]
})
  .scopes(youtubeActionScopes.managePlaylistItems)
  .input(
    z.object({
      action: z.enum(['list', 'add', 'update', 'remove']).describe('Action to perform'),
      playlistId: z
        .string()
        .optional()
        .describe('Playlist ID (required for list, add, update)'),
      playlistItemId: z
        .string()
        .optional()
        .describe('Playlist item ID (required for update and remove)'),
      videoId: z
        .string()
        .optional()
        .describe('Video ID to add or the current video for update'),
      position: z.number().optional().describe('Position in the playlist (0-indexed)'),
      maxResults: z.number().min(1).max(50).optional().describe('Max results for list action'),
      pageToken: z.string().optional().describe('Pagination token for list action')
    })
  )
  .output(
    z.object({
      items: z
        .array(
          z.object({
            playlistItemId: z.string(),
            videoId: z.string().optional(),
            title: z.string().optional(),
            description: z.string().optional(),
            position: z.number().optional(),
            publishedAt: z.string().optional(),
            channelTitle: z.string().optional()
          })
        )
        .optional(),
      nextPageToken: z.string().optional(),
      totalResults: z.number().optional(),
      addedItemId: z.string().optional(),
      removed: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);

    if (ctx.input.action === 'list') {
      if (!ctx.input.playlistId)
        throw youtubeServiceError('playlistId is required for listing items');

      let response = await client.listPlaylistItems({
        part: ['snippet', 'contentDetails', 'status'],
        playlistId: ctx.input.playlistId,
        maxResults: ctx.input.maxResults,
        pageToken: ctx.input.pageToken
      });

      let items = response.items.map(item => ({
        playlistItemId: item.id,
        videoId: item.contentDetails?.videoId || item.snippet?.resourceId?.videoId,
        title: item.snippet?.title,
        description: item.snippet?.description,
        position: item.snippet?.position,
        publishedAt: item.snippet?.publishedAt,
        channelTitle: item.snippet?.channelTitle
      }));

      return {
        output: {
          items,
          nextPageToken: response.nextPageToken,
          totalResults: response.pageInfo?.totalResults
        },
        message: `Listed **${items.length}** items from playlist.${response.nextPageToken ? ' More pages available.' : ''}`
      };
    } else if (ctx.input.action === 'add') {
      if (!ctx.input.playlistId) throw youtubeServiceError('playlistId is required');
      if (!ctx.input.videoId) throw youtubeServiceError('videoId is required');

      let item = await client.addPlaylistItem({
        part: ['snippet'],
        playlistId: ctx.input.playlistId,
        videoId: ctx.input.videoId,
        position: ctx.input.position
      });

      return {
        output: {
          addedItemId: item.id,
          items: [
            {
              playlistItemId: item.id,
              videoId: ctx.input.videoId,
              title: item.snippet?.title,
              position: item.snippet?.position
            }
          ]
        },
        message: `Added video \`${ctx.input.videoId}\` to playlist at position ${item.snippet?.position ?? 'end'}.`
      };
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.playlistItemId) throw youtubeServiceError('playlistItemId is required');
      if (!ctx.input.playlistId) throw youtubeServiceError('playlistId is required');
      if (!ctx.input.videoId) throw youtubeServiceError('videoId is required');

      let item = await client.updatePlaylistItem({
        part: ['snippet'],
        playlistItemId: ctx.input.playlistItemId,
        playlistId: ctx.input.playlistId,
        videoId: ctx.input.videoId,
        position: ctx.input.position
      });

      return {
        output: {
          items: [
            {
              playlistItemId: item.id,
              videoId: ctx.input.videoId,
              title: item.snippet?.title,
              position: item.snippet?.position
            }
          ]
        },
        message: `Updated playlist item position to ${item.snippet?.position ?? 'unknown'}.`
      };
    } else {
      if (!ctx.input.playlistItemId) throw youtubeServiceError('playlistItemId is required');

      await client.deletePlaylistItem(ctx.input.playlistItemId);

      return {
        output: { removed: true },
        message: `Removed item \`${ctx.input.playlistItemId}\` from playlist.`
      };
    }
  })
  .build();
