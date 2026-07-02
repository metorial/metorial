import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchApiClient } from '../lib/client';
import { spec } from '../spec';

let youtubeVideoSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Video title'),
  link: z.string().optional().describe('Video URL'),
  channelName: z.string().optional().describe('Channel name'),
  channelLink: z.string().optional().describe('Channel URL'),
  views: z.string().optional().describe('View count text'),
  publishedDate: z.string().optional().describe('Publication date'),
  length: z.string().optional().describe('Video duration'),
  description: z.string().optional().describe('Video description snippet'),
  thumbnail: z.string().optional().describe('Thumbnail URL'),
  isLive: z.boolean().optional().describe('Whether the video is a live stream')
});

export let youtubeSearch = SlateTool.create(spec, {
  name: 'YouTube Search',
  key: 'youtube_search',
  description: `Search YouTube for videos, channels, and playlists. Returns video metadata including title, channel, views, duration, and thumbnails. Supports filtering by upload date and pagination.`,
  instructions: [
    'Use **filterCode** (sp parameter) for advanced filtering, e.g., "CAI" for recently uploaded videos.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('YouTube search query'),
      country: z.string().optional().describe('Country code (e.g., "us")'),
      language: z.string().optional().describe('Interface language code'),
      filterCode: z
        .string()
        .optional()
        .describe(
          'YouTube sp filter parameter for advanced filtering (e.g., "CAI" for recent uploads)'
        ),
      nextPageToken: z.string().optional().describe('Pagination token from previous results')
    })
  )
  .output(
    z.object({
      searchQuery: z.string().optional().describe('The query that was searched'),
      totalResults: z.number().optional().describe('Total number of results'),
      videos: z.array(youtubeVideoSchema).describe('YouTube video results'),
      nextPageToken: z.string().optional().describe('Token for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchApiClient({ token: ctx.auth.token });

    let data = await client.search({
      engine: 'youtube',
      q: ctx.input.query,
      gl: ctx.input.country,
      hl: ctx.input.language,
      sp: ctx.input.filterCode || ctx.input.nextPageToken
    });

    let videos = (data.videos || []).map((v: any) => ({
      position: v.position,
      title: v.title,
      link: v.link,
      channelName: v.channel?.name,
      channelLink: v.channel?.link,
      views: v.views,
      publishedDate: v.published_date,
      length: v.length,
      description: v.description,
      thumbnail: v.thumbnail?.static || v.thumbnail,
      isLive: v.is_live || undefined
    }));

    return {
      output: {
        searchQuery: data.search_parameters?.q || ctx.input.query,
        totalResults: data.search_information?.total_results,
        videos,
        nextPageToken: data.pagination?.next_page_token
      },
      message: `Found ${videos.length} YouTube video${videos.length !== 1 ? 's' : ''} for "${ctx.input.query}".`
    };
  })
  .build();
