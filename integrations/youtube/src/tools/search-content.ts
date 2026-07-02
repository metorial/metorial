import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

let thumbnailSchema = z
  .object({
    url: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional()
  })
  .optional();

let thumbnailsSchema = z
  .object({
    default: thumbnailSchema,
    medium: thumbnailSchema,
    high: thumbnailSchema
  })
  .optional();

export let searchContent = SlateTool.create(spec, {
  name: 'Search YouTube',
  key: 'search_content',
  description: `Search for videos, channels, and playlists on YouTube. Supports filtering by search terms, channel, type, date range, region, video duration, definition, and more. Returns paginated results with snippet information.`,
  tags: {
    readOnly: true
  }
})
  .scopes(youtubeActionScopes.searchContent)
  .input(
    z.object({
      query: z.string().optional().describe('Search query string'),
      type: z
        .array(z.enum(['video', 'channel', 'playlist']))
        .optional()
        .describe('Restrict results to specific resource types'),
      channelId: z.string().optional().describe('Restrict results to a specific channel'),
      maxResults: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of results (1-50, default 25)'),
      pageToken: z.string().optional().describe('Token for pagination'),
      order: z
        .enum(['date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount'])
        .optional()
        .describe('Sort order for results'),
      publishedAfter: z
        .string()
        .optional()
        .describe('Filter results published after this ISO 8601 date'),
      publishedBefore: z
        .string()
        .optional()
        .describe('Filter results published before this ISO 8601 date'),
      regionCode: z
        .string()
        .optional()
        .describe('ISO 3166-1 alpha-2 country code to restrict results'),
      relevanceLanguage: z
        .string()
        .optional()
        .describe('ISO 639-1 language code for result relevance'),
      videoDuration: z
        .enum(['any', 'short', 'medium', 'long'])
        .optional()
        .describe('Filter by video duration'),
      videoDefinition: z
        .enum(['any', 'high', 'standard'])
        .optional()
        .describe('Filter by video definition (HD/SD)'),
      videoType: z
        .enum(['any', 'episode', 'movie'])
        .optional()
        .describe('Filter by video type'),
      eventType: z
        .enum(['completed', 'live', 'upcoming'])
        .optional()
        .describe('Filter by broadcast event type'),
      topicId: z.string().optional().describe('Freebase topic ID to filter results')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          resourceKind: z
            .string()
            .describe('Kind of resource: youtube#video, youtube#channel, or youtube#playlist'),
          videoId: z.string().optional().describe('Video ID if result is a video'),
          channelId: z.string().optional().describe('Channel ID if result is a channel'),
          playlistId: z.string().optional().describe('Playlist ID if result is a playlist'),
          title: z.string().optional(),
          description: z.string().optional(),
          publishedAt: z.string().optional(),
          channelTitle: z.string().optional(),
          thumbnails: thumbnailsSchema
        })
      ),
      totalResults: z.number().optional(),
      nextPageToken: z.string().optional(),
      prevPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);

    let response = await client.search({
      query: ctx.input.query,
      type: ctx.input.type,
      channelId: ctx.input.channelId,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken,
      order: ctx.input.order,
      publishedAfter: ctx.input.publishedAfter,
      publishedBefore: ctx.input.publishedBefore,
      regionCode: ctx.input.regionCode,
      relevanceLanguage: ctx.input.relevanceLanguage,
      videoDuration: ctx.input.videoDuration,
      videoDefinition: ctx.input.videoDefinition,
      videoType: ctx.input.videoType,
      eventType: ctx.input.eventType,
      topicId: ctx.input.topicId
    });

    let results = response.items.map(item => ({
      resourceKind: item.id.kind,
      videoId: item.id.videoId,
      channelId: item.id.channelId || item.snippet?.channelId,
      playlistId: item.id.playlistId,
      title: item.snippet?.title,
      description: item.snippet?.description,
      publishedAt: item.snippet?.publishedAt,
      channelTitle: item.snippet?.channelTitle,
      thumbnails: item.snippet?.thumbnails
        ? {
            default: item.snippet.thumbnails.default,
            medium: item.snippet.thumbnails.medium,
            high: item.snippet.thumbnails.high
          }
        : undefined
    }));

    return {
      output: {
        results,
        totalResults: response.pageInfo?.totalResults,
        nextPageToken: response.nextPageToken,
        prevPageToken: response.prevPageToken
      },
      message: `Found **${results.length}** results${ctx.input.query ? ` for "${ctx.input.query}"` : ''}${response.nextPageToken ? ' (more pages available)' : ''}.`
    };
  })
  .build();
