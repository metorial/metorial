import { SlateTool } from 'slates';
import { z } from 'zod';
import { SerpApiClient } from '../lib/client';
import { spec } from '../spec';

let videoResultSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Video title'),
  link: z.string().optional().describe('Video URL'),
  channelName: z.string().optional().describe('Channel or uploader name'),
  channelLink: z.string().optional().describe('Channel URL'),
  publishedDate: z.string().optional().describe('Publication date'),
  views: z.number().optional().describe('Number of views'),
  length: z.string().optional().describe('Video duration'),
  description: z.string().optional().describe('Video description snippet'),
  thumbnailUrl: z.string().optional().describe('Video thumbnail URL'),
  isLive: z.boolean().optional().describe('Whether the video is currently live')
});

export let videoSearchTool = SlateTool.create(spec, {
  name: 'Video Search',
  key: 'video_search',
  description: `Search for videos using YouTube or Google Videos. Returns video titles, durations, view counts, channel information, thumbnails, and descriptions. Supports YouTube-specific features like filtering and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Video search query'),
      engine: z
        .enum(['youtube', 'google_videos'])
        .default('youtube')
        .describe('Video search engine to use'),
      language: z.string().optional().describe('Language code (e.g., "en")'),
      country: z.string().optional().describe('Country code (e.g., "us")'),
      sortBy: z
        .string()
        .optional()
        .describe('YouTube sort/filter token (e.g., "CAI=" for upload date)'),
      noCache: z.boolean().optional().describe('Force fresh results')
    })
  )
  .output(
    z.object({
      videoResults: z.array(videoResultSchema).describe('Video search results'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for fetching the next page of results (YouTube)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token });

    let params: Record<string, any> = {
      engine: ctx.input.engine
    };

    if (ctx.input.engine === 'youtube') {
      params.search_query = ctx.input.query;
    } else {
      params.q = ctx.input.query;
    }

    if (ctx.input.language) params.hl = ctx.input.language;
    if (ctx.input.country) params.gl = ctx.input.country;
    if (ctx.input.sortBy) params.sp = ctx.input.sortBy;
    if (ctx.input.noCache) params.no_cache = ctx.input.noCache;

    let data = await client.search(params);

    let results = data.video_results || data.movie_results || [];
    let videoResults = results.map((r: any) => ({
      position: r.position || r.position_on_page,
      title: r.title,
      link: r.link,
      channelName: r.channel?.name,
      channelLink: r.channel?.link,
      publishedDate: r.published_date,
      views: r.views,
      length: r.length,
      description: r.description,
      thumbnailUrl: r.thumbnail?.static || r.thumbnail,
      isLive: r.live
    }));

    let nextPageToken = data.serpapi_pagination?.next_page_token;

    return {
      output: {
        videoResults,
        nextPageToken
      },
      message: `Video search for "${ctx.input.query}" on ${ctx.input.engine} returned **${videoResults.length}** results.`
    };
  })
  .build();
