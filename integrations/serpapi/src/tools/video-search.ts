import { SlateTool } from 'slates';
import { z } from 'zod';
import { receiptMessage, receiptOutput, SerpApiClient } from '../lib/client';
import { number, searchMetadataSchema, text } from '../lib/contracts';
import { searchParams } from '../lib/params';
import { spec } from '../spec';

let videoResultSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Video title'),
  link: z.string().optional().describe('Video URL'),
  channelName: z.string().optional().describe('Channel or uploader name'),
  channelLink: z.string().optional().describe('Channel URL'),
  publishedDate: z.string().optional().describe('Publication date'),
  viewsDisplay: z
    .string()
    .optional()
    .describe('Native displayed view count when not numeric.'),
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
      nextPageToken: z
        .string()
        .optional()
        .describe(
          'Exact YouTube next_page_token; sent as native sp. Mutually exclusive with sortBy.'
        ),
      startOffset: z
        .number()
        .optional()
        .describe('Native Google Videos result offset, starting at 0.'),
      async: z
        .boolean()
        .optional()
        .describe(
          'Submit asynchronously and return the native search ID/status. Not compatible with noCache or Ludicrous Speed accounts.'
        ),
      noCache: z.boolean().optional().describe('Force fresh results')
    })
  )
  .output(
    z.object({
      isComplete: z
        .boolean()
        .describe(
          'Whether native search status is Success; queued/processing receipts are incomplete.'
        ),
      pagination: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Native pagination metadata; follow native offsets/tokens without inferring a total.'
        ),
      searchMetadata: searchMetadataSchema.optional(),
      videoResults: z.array(videoResultSchema).describe('Video search results'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for fetching the next page of results (YouTube)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token, accountId: ctx.auth.accountId });

    let params = searchParams('video_search', ctx.input);

    let data = await client.search(params);

    let results = data.video_results || data.movie_results || [];
    let videoResults = results.map((r: any) => ({
      position: r.position ?? r.position_on_page,
      title: r.title,
      link: r.link,
      channelName: r.channel?.name,
      channelLink: r.channel?.link,
      publishedDate: r.published_date,
      views: number(r.views),
      viewsDisplay: text(r.views),
      length: r.length,
      description: r.description,
      thumbnailUrl: text(r.thumbnail?.static) ?? text(r.thumbnail),
      isLive: r.live
    }));

    let nextPageToken = data.serpapi_pagination?.next_page_token;

    return {
      output: {
        ...receiptOutput(data),
        videoResults,
        nextPageToken
      },
      message: receiptMessage(
        data,
        `Video search for "${ctx.input.query}" on ${ctx.input.engine} returned **${videoResults.length}** results.`
      )
    };
  })
  .build();
