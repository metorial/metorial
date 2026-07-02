import { SlateTool } from 'slates';
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
        .enum(['video', 'channel', 'playlist'])
        .optional()
        .describe('Filter results by type'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      order: z
        .enum(['relevance', 'date', 'viewCount', 'rating'])
        .optional()
        .describe('Sort order for results')
    })
  )
  .output(
    z.object({
      results: z.array(searchResultSchema).describe('Search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchYouTube({
      query: ctx.input.query,
      type: ctx.input.type,
      limit: ctx.input.limit,
      order: ctx.input.order
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
      publishedAt: item.publishedAt,
      viewCount: item.viewCount ?? item.views,
      duration: item.duration
    }));

    return {
      output: {
        results: mapped
      },
      message: `Found **${mapped.length}** YouTube results for "${ctx.input.query}".`
    };
  })
  .build();
