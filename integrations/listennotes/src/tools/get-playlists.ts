import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPlaylists = SlateTool.create(spec, {
  name: 'Get Playlists',
  key: 'get_playlists',
  description: `Fetch your Listen Notes playlists. Without a playlistId, returns a paginated list of all your playlists.
With a playlistId, returns the full playlist with its items (episodes or podcasts).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      playlistId: z
        .string()
        .optional()
        .describe(
          'Specific playlist ID to fetch full details for. If omitted, returns a list of all playlists.'
        ),
      playlistType: z
        .enum(['episode_list', 'podcast_list'])
        .optional()
        .describe('Type of playlist items to fetch (when fetching a specific playlist).'),
      sort: z
        .enum([
          'recent_added_first',
          'oldest_added_first',
          'recent_published_first',
          'oldest_published_first',
          'name_a_to_z',
          'name_z_to_a'
        ])
        .optional()
        .describe('Sort order. name_a_to_z and name_z_to_a only apply to playlist listing.'),
      page: z
        .number()
        .optional()
        .describe('Page number for playlist listing (not for specific playlist).'),
      lastTimestampMs: z
        .number()
        .optional()
        .describe('Pagination cursor for items within a specific playlist.')
    })
  )
  .output(
    z.object({
      playlistId: z
        .string()
        .optional()
        .describe('Playlist ID (when fetching a specific playlist).'),
      name: z
        .string()
        .optional()
        .describe('Playlist name (when fetching a specific playlist).'),
      description: z
        .string()
        .optional()
        .describe('Playlist description (when fetching a specific playlist).'),
      image: z.string().optional().describe('Playlist image URL.'),
      visibility: z
        .string()
        .optional()
        .describe('Playlist visibility (public, unlisted, private).'),
      total: z.number().describe('Total number of items.'),
      items: z
        .array(z.any())
        .optional()
        .describe('Playlist items (when fetching a specific playlist).'),
      lastTimestampMs: z
        .number()
        .optional()
        .describe('Pagination cursor for next page of items.'),
      playlists: z
        .array(
          z.object({
            playlistId: z.string().describe('Playlist ID.'),
            name: z.string().describe('Playlist name.'),
            description: z.string().describe('Playlist description.'),
            image: z.string().describe('Playlist image URL.'),
            visibility: z.string().describe('Visibility setting.'),
            totalItems: z.number().describe('Number of items in the playlist.')
          })
        )
        .optional()
        .describe('Array of playlists (when listing all playlists).'),
      pageNumber: z
        .number()
        .optional()
        .describe('Current page number (when listing playlists).'),
      hasNext: z.boolean().optional().describe('Whether there is a next page.'),
      hasPrevious: z.boolean().optional().describe('Whether there is a previous page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.playlistId) {
      let data = await client.getPlaylist({
        playlistId: ctx.input.playlistId,
        type: ctx.input.playlistType,
        lastTimestampMs: ctx.input.lastTimestampMs,
        sort: ctx.input.sort as
          | 'recent_added_first'
          | 'oldest_added_first'
          | 'recent_published_first'
          | 'oldest_published_first'
          | undefined
      });

      return {
        output: {
          playlistId: data.id,
          name: data.name,
          description: data.description,
          image: data.image || '',
          visibility: data.visibility,
          total: data.total,
          items: data.items,
          lastTimestampMs: data.last_timestamp_ms
        },
        message: `Fetched playlist **${data.name}** with ${data.total} items.`
      };
    } else {
      let data = await client.getPlaylists({
        sort: ctx.input.sort as
          | 'recent_added_first'
          | 'oldest_added_first'
          | 'name_a_to_z'
          | 'name_z_to_a'
          | undefined,
        page: ctx.input.page
      });

      return {
        output: {
          total: data.total,
          playlists: data.playlists.map(p => ({
            playlistId: p.id,
            name: p.name,
            description: p.description,
            image: p.image || '',
            visibility: p.visibility,
            totalItems: p.total
          })),
          pageNumber: data.page_number,
          hasNext: data.has_next,
          hasPrevious: data.has_previous
        },
        message: `Found **${data.total}** playlists (page ${data.page_number}).`
      };
    }
  })
  .build();
