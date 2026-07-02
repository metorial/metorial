import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchGoogleShortVideos = SlateTool.create(spec, {
  name: 'Search Google Short Videos',
  key: 'search_google_short_videos',
  description: `Search for short-form video results from Google. Returns structured short video data including titles, links, thumbnails, clips, sources, channels, and durations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Short video search query'),
      domain: z.string().default('google.com').describe('Google domain to search'),
      lang: z.string().default('en').describe('Language code'),
      device: z.enum(['desktop', 'mobile']).default('desktop').describe('Device type'),
      loc: z.string().optional().describe('Location name'),
      locId: z.number().optional().describe('Location ID'),
      dateRange: z.string().optional().describe('Date filter'),
      page: z.number().optional().describe('Page number'),
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
      shortVideos: z.array(z.any()).optional().describe('Short video results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.googleShortVideosSearch({
      q: ctx.input.query,
      domain: ctx.input.domain,
      lang: ctx.input.lang,
      device: ctx.input.device,
      ...(ctx.input.loc ? { loc: ctx.input.loc } : {}),
      ...(ctx.input.locId ? { loc_id: ctx.input.locId } : {}),
      ...(ctx.input.dateRange ? { date_range: ctx.input.dateRange } : {}),
      ...(ctx.input.page ? { page: ctx.input.page } : {}),
      ...(ctx.input.videoQuality ? { video_quality: ctx.input.videoQuality } : {}),
      ...(ctx.input.videoCaptions ? { video_captions: ctx.input.videoCaptions } : {})
    });

    let resultsData = response?.results;
    let videoCount = resultsData?.results?.short_videos?.length ?? 0;

    return {
      output: {
        status: response?.status ?? 'unknown',
        message: response?.msg ?? '',
        searchMetadata: resultsData?.search_metadata,
        searchParameters: resultsData?.search_parameters,
        shortVideos: resultsData?.results?.short_videos ?? []
      },
      message: `Google Short Videos search for **"${ctx.input.query}"** returned **${videoCount}** results.`
    };
  })
  .build();
