import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let scholarResultSchema = z.object({
  title: z.string().optional().describe('Paper or article title'),
  link: z.string().optional().describe('URL to the paper'),
  description: z.string().optional().describe('Abstract or description snippet')
});

export let scholarSearch = SlateTool.create(spec, {
  name: 'Scholar Search',
  key: 'scholar_search',
  description: `Search Google Scholar for academic papers, articles, and research. Returns paper titles, links, and descriptions/abstracts. Useful for building literature review tools, citation managers, research dashboards, or finding academic sources on a topic.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Academic search query (e.g., "machine learning", "quantum computing")'),
      num: z.number().optional().describe('Number of results to return'),
      start: z.number().optional().describe('Start offset for pagination'),
      language: z.string().optional().describe('Search language filter (e.g., lang_en)'),
      interfaceLanguage: z.string().optional().describe('Interface language code (e.g., en)'),
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
        .describe('Geographic location for results, overrides default'),
      deviceType: z
        .enum(['desktop', 'mobile'])
        .optional()
        .describe('Device type for results, overrides default')
    })
  )
  .output(
    z.object({
      results: z.array(scholarResultSchema).describe('Scholar search results'),
      total: z.number().optional().describe('Total number of results available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      proxyLocation: ctx.config.proxyLocation,
      deviceType: ctx.config.deviceType
    });

    let data = await client.scholarSearch({
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
      message: `Found **${results.length}** academic results for "${ctx.input.query}".`
    };
  })
  .build();
