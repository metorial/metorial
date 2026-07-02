import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let searchResultSchema = z.object({
  title: z.string().optional().describe('Title of the search result'),
  link: z.string().optional().describe('URL of the search result'),
  description: z.string().optional().describe('Description snippet of the search result')
});

export let webSearch = SlateTool.create(spec, {
  name: 'Google Web Search',
  key: 'web_search',
  description: `Search Google and retrieve structured web results as JSON. Returns organic search results with titles, links, and descriptions, plus answer box content when available. Supports Google search operators (e.g., \`site:\`, date ranges), pagination, language filtering, and geo-targeting.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Search query string. Supports Google search operators like site:, intitle:, etc.'
        ),
      num: z.number().optional().describe('Number of results to return'),
      start: z.number().optional().describe('Start offset for pagination'),
      language: z
        .string()
        .optional()
        .describe('Search language filter (e.g., lang_en, lang_es, lang_fr)'),
      interfaceLanguage: z
        .string()
        .optional()
        .describe('Interface language code (e.g., en, es, fr)'),
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
      results: z.array(searchResultSchema).describe('Organic search results'),
      total: z.number().optional().describe('Total number of results available'),
      answer: z.any().optional().describe('Answer box content if present')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      proxyLocation: ctx.config.proxyLocation,
      deviceType: ctx.config.deviceType
    });

    let data = await client.webSearch({
      query: ctx.input.query,
      num: ctx.input.num,
      start: ctx.input.start,
      lr: ctx.input.language,
      hl: ctx.input.interfaceLanguage,
      proxyLocation: ctx.input.proxyLocation,
      deviceType: ctx.input.deviceType
    });

    let results = data.results || [];
    let total = data.total || 0;

    return {
      output: {
        results,
        total,
        answer: data.answer || null
      },
      message: `Found **${results.length}** web results${total ? ` out of ${total} total` : ''} for "${ctx.input.query}".`
    };
  })
  .build();
