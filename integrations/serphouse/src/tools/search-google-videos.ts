import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchGoogleVideos = SlateTool.create(spec, {
  name: 'Search Google Videos',
  key: 'search_google_videos',
  description: `Search for video results from Google. Returns structured video data including titles, links, thumbnails, durations, snippets, and key moments. Supports filtering by video duration, quality, and captions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Video search query'),
      domain: z.string().default('google.com').describe('Google domain to search'),
      lang: z.string().default('en').describe('Language code'),
      device: z.enum(['desktop', 'mobile']).default('desktop').describe('Device type'),
      loc: z.string().optional().describe('Location name'),
      locId: z.number().optional().describe('Location ID'),
      dateRange: z.string().optional().describe('Date filter'),
      page: z.number().optional().describe('Page number'),
      videoDuration: z
        .enum(['short', 'medium', 'long'])
        .optional()
        .describe('Filter by video duration'),
      videoQuality: z.enum(['high']).optional().describe('Filter by video quality'),
      videoCaptions: z
        .enum(['captioned'])
        .optional()
        .describe('Filter to only captioned videos')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      message: z.string().describe('Response message'),
      searchMetadata: z.any().optional().describe('Search metadata'),
      searchParameters: z.any().optional().describe('Search parameters used'),
      videos: z.any().optional().describe('Video search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.googleVideosSearch({
      q: ctx.input.query,
      domain: ctx.input.domain,
      lang: ctx.input.lang,
      device: ctx.input.device,
      ...(ctx.input.loc ? { loc: ctx.input.loc } : {}),
      ...(ctx.input.locId ? { loc_id: ctx.input.locId } : {}),
      ...(ctx.input.dateRange ? { date_range: ctx.input.dateRange } : {}),
      ...(ctx.input.page ? { page: ctx.input.page } : {}),
      ...(ctx.input.videoDuration ? { video_duration: ctx.input.videoDuration } : {}),
      ...(ctx.input.videoQuality ? { video_quality: ctx.input.videoQuality } : {}),
      ...(ctx.input.videoCaptions ? { video_captions: ctx.input.videoCaptions } : {})
    });

    let resultsData = response?.results;

    return {
      output: {
        status: response?.status ?? 'unknown',
        message: response?.msg ?? '',
        searchMetadata: resultsData?.search_metadata,
        searchParameters: resultsData?.search_parameters,
        videos: resultsData?.results
      },
      message: `Google Videos search for **"${ctx.input.query}"** completed.`
    };
  })
  .build();
