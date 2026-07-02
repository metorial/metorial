import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let imageResultSchema = z.object({
  title: z.string().optional().describe('Image title'),
  link: z.string().optional().describe('Direct image URL'),
  description: z.string().optional().describe('Image description'),
  thumbnailUrl: z.string().optional().describe('Thumbnail image URL'),
  source: z.string().optional().describe('Source website'),
  width: z.number().optional().describe('Image width in pixels'),
  height: z.number().optional().describe('Image height in pixels')
});

export let imageSearch = SlateTool.create(spec, {
  name: 'Image Search',
  key: 'image_search',
  description: `Search Google Images and retrieve structured image results. Returns image metadata including titles, direct image URLs, descriptions, thumbnails, dimensions, and source information. Useful for finding images, building image galleries, or content research.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Image search query'),
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
      results: z.array(imageResultSchema).describe('Image search results'),
      total: z.number().optional().describe('Total number of image results available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      proxyLocation: ctx.config.proxyLocation,
      deviceType: ctx.config.deviceType
    });

    let data = await client.imageSearch({
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
        total: data.total || 0
      },
      message: `Found **${results.length}** images for "${ctx.input.query}".`
    };
  })
  .build();
