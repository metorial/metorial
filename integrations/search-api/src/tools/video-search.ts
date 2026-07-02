import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchApiClient } from '../lib/client';
import { spec } from '../spec';

let videoResultSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Video title'),
  link: z.string().optional().describe('Video URL'),
  snippet: z.string().optional().describe('Video description snippet'),
  source: z.string().optional().describe('Source platform'),
  channel: z.string().optional().describe('Channel or uploader name'),
  date: z.string().optional().describe('Upload date'),
  length: z.string().optional().describe('Video duration'),
  thumbnail: z.string().optional().describe('Thumbnail URL')
});

export let videoSearch = SlateTool.create(spec, {
  name: 'Google Videos Search',
  key: 'video_search',
  description: `Search Google Videos for video results across platforms like YouTube, TikTok, Facebook, and more. Returns video metadata including title, duration, source, channel, and thumbnails. Supports duration, quality, and source platform filters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Video search query'),
      location: z.string().optional().describe('Geographic location'),
      country: z.string().optional().describe('Country code'),
      language: z.string().optional().describe('Interface language code'),
      device: z.enum(['desktop', 'mobile', 'tablet']).optional().describe('Device type'),
      page: z.number().optional().describe('Results page number'),
      duration: z
        .enum(['short', 'medium', 'long'])
        .optional()
        .describe('Video duration filter'),
      quality: z.enum(['high']).optional().describe('Video quality filter'),
      sourcePlatform: z
        .enum(['youtube', 'tiktok', 'facebook', 'dailymotion', 'twitch', 'vimeo'])
        .optional()
        .describe('Filter by source platform'),
      timePeriod: z
        .enum(['last_hour', 'last_day', 'last_week', 'last_month', 'last_year'])
        .optional()
        .describe('Filter videos by recency'),
      captioned: z.boolean().optional().describe('Filter for videos with closed captions')
    })
  )
  .output(
    z.object({
      searchQuery: z.string().optional().describe('The query that was searched'),
      videos: z.array(videoResultSchema).describe('Video search results'),
      relatedSearches: z.array(z.string()).optional().describe('Related search queries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchApiClient({ token: ctx.auth.token });

    let data = await client.search({
      engine: 'google_videos',
      q: ctx.input.query,
      location: ctx.input.location,
      gl: ctx.input.country,
      hl: ctx.input.language,
      device: ctx.input.device,
      page: ctx.input.page,
      duration: ctx.input.duration,
      quality: ctx.input.quality,
      source: ctx.input.sourcePlatform,
      time_period: ctx.input.timePeriod,
      captioned: ctx.input.captioned ? 1 : undefined
    });

    let videos = (data.videos || []).map((v: any) => ({
      position: v.position,
      title: v.title,
      link: v.link,
      snippet: v.snippet,
      source: v.source,
      channel: v.channel?.name || v.channel,
      date: v.date,
      length: v.length,
      thumbnail: v.thumbnail
    }));

    let relatedSearches = (data.related_searches || [])
      .map((r: any) => r.query)
      .filter(Boolean);

    return {
      output: {
        searchQuery: data.search_parameters?.q || ctx.input.query,
        videos,
        relatedSearches: relatedSearches.length > 0 ? relatedSearches : undefined
      },
      message: `Found ${videos.length} video${videos.length !== 1 ? 's' : ''} for "${ctx.input.query}".`
    };
  })
  .build();
