import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let videoResultSchema = z.object({
  title: z.string().optional().describe('Video title'),
  link: z.string().optional().describe('Video URL'),
  description: z.string().optional().describe('Video description')
});

export let videoSearch = SlateTool.create(spec, {
  name: 'Video Search',
  key: 'video_search',
  description: `Search Google for videos and retrieve structured video results. Returns video titles, links, and descriptions. Useful for finding video content, building video aggregators, or researching video topics.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Video search query'),
      num: z.number().optional().describe('Number of results to return'),
      start: z.number().optional().describe('Start offset for pagination'),
      language: z
        .string()
        .optional()
        .describe('Search language filter (e.g., lang_en, lang_es)'),
      interfaceLanguage: z
        .string()
        .optional()
        .describe('Interface language code (e.g., en, es)'),
      proxyLocation: z
        .enum([
          'US',
          'EU',
          'CA',
          'GB',
          'FR',
          'DE',
          'SE',
          'IE',
          'IN',
          'JP',
          'KR',
          'SG',
          'AU',
          'BR'
        ])
        .optional()
        .describe('Geographic location for geo-targeted results, overrides default'),
      deviceType: z
        .enum(['desktop', 'mobile'])
        .optional()
        .describe('Device type for results, overrides default')
    })
  )
  .output(
    z.object({
      results: z.array(videoResultSchema).describe('Video search results'),
      total: z.number().optional().describe('Total number of video results available'),
      answer: z.any().optional().describe('Answer box content if present')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      proxyLocation: ctx.config.proxyLocation,
      deviceType: ctx.config.deviceType
    });

    let data = await client.videoSearch({
      query: ctx.input.query,
      num: ctx.input.num,
      start: ctx.input.start,
      lr: ctx.input.language,
      hl: ctx.input.interfaceLanguage,
      proxyLocation: ctx.input.proxyLocation,
      deviceType: ctx.input.deviceType
    });

    let results = data.results || [];

    return {
      output: {
        results,
        total: data.total || 0,
        answer: data.answer || null
      },
      message: `Found **${results.length}** videos for "${ctx.input.query}".`
    };
  })
  .build();
