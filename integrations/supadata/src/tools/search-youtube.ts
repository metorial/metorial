import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let searchResultSchema = z.object({
  resultId: z
    .string()
    .optional()
    .describe('ID of the search result (video, channel, or playlist ID)'),
  type: z.string().optional().describe('Type of result (video, channel, playlist)'),
  title: z.string().optional().describe('Title of the result'),
  description: z.string().optional().describe('Description snippet'),
  thumbnail: z.string().optional().describe('Thumbnail URL'),
  channelName: z.string().optional().describe('Channel name'),
  channelId: z.string().optional().describe('Channel ID'),
  publishedAt: z.string().optional().describe('Published date'),
  viewCount: z.number().optional().describe('View count (for videos)'),
  duration: z.number().optional().describe('Duration in seconds (for videos)')
});

export let searchYouTube = SlateTool.create(spec, {
  name: 'Search YouTube',
  key: 'search_youtube',
  description: `Search YouTube for videos, channels, and playlists. Supports filtering by type and sorting by relevance, date, view count, or rating.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      type: z
        .enum(['video', 'channel', 'playlist', 'all', 'movie'])
        .optional()
        .describe('Filter results by type'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      order: z
        .enum(['relevance', 'date', 'viewCount', 'rating'])
        .optional()
        .describe('Sort order for results'),
      nextPageToken: z
        .string()
        .optional()
        .describe(
          'Continuation token from a previous search. The query is still required; other filters are ignored.'
        ),
      uploadDate: z
        .enum(['all', 'hour', 'today', 'week', 'month', 'year'])
        .optional()
        .describe('Filter videos by upload date'),
      duration: z
        .enum(['all', 'short', 'medium', 'long'])
        .optional()
        .describe(
          'Filter videos by duration: short under 4 minutes, medium 4-20 minutes, long over 20 minutes'
        ),
      features: z
        .array(
          z.enum([
            'hd',
            'subtitles',
            'creative-commons',
            '3d',
            'live',
            '4k',
            '360',
            'location',
            'hdr',
            'vr180'
          ])
        )
        .optional()
        .describe('Special video features to require')
    })
  )
  .output(
    z.object({
      results: z.array(searchResultSchema).describe('Search results'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for the next page; omitted when limit enables automatic pagination')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.limit !== undefined &&
      (!Number.isInteger(ctx.input.limit) || ctx.input.limit < 1 || ctx.input.limit > 5000)
    ) {
      throw createApiServiceError('Search limit must be a whole number from 1 to 5000.');
    }

    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchYouTube({
      query: ctx.input.query,
      type: ctx.input.type,
      limit: ctx.input.limit,
      order: ctx.input.order,
      nextPageToken: ctx.input.nextPageToken,
      uploadDate: ctx.input.uploadDate,
      duration: ctx.input.duration,
      features: ctx.input.features
    });

    let results = result.results ?? result.items ?? result;
    let items = Array.isArray(results) ? results : [];

    let mapped = items.map((item: any) => ({
      resultId: item.id ?? item.videoId ?? item.channelId ?? item.playlistId,
      type: item.type,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail,
      channelName: item.channelName ?? item.channel?.name,
      channelId: item.channelId ?? item.channel?.id,
      publishedAt: item.publishedAt ?? item.uploadDate ?? undefined,
      viewCount: item.viewCount ?? item.views ?? undefined,
      duration: item.duration ?? undefined
    }));

    return {
      output: {
        results: mapped,
        nextPageToken: result.nextPageToken ?? undefined
      },
      message: `Found **${mapped.length}** YouTube results for "${ctx.input.query}".`
    };
  })
  .build();
