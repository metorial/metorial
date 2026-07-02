import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let googleSearch = SlateTool.create(spec, {
  name: 'Google Search',
  key: 'google_search',
  description: `Search Google and get structured JSON results. Supports regular search, news, maps, images, Google Lens, shopping, and AI mode. Returns organic results, ads, knowledge graph, and other SERP features.`,
  instructions: [
    'Use searchType to specify the type of Google search (default is regular web search).',
    'Supported search types: "news", "maps", "images", "lens", "shopping", "ai_mode".',
    'Use additionalParams to pass any extra Google parameters like "gl", "hl", "tbs", etc.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The search query'),
      searchType: z
        .enum(['search', 'news', 'maps', 'images', 'lens', 'shopping', 'ai_mode'])
        .optional()
        .describe('Type of Google search to perform'),
      language: z
        .string()
        .optional()
        .describe('Language code for results (e.g., "en", "fr", "de")'),
      countryCode: z
        .string()
        .optional()
        .describe('Two-letter country code for localized results'),
      location: z
        .string()
        .optional()
        .describe(
          'Location string for geo-targeted results (e.g., "New York,NY,United States")'
        ),
      nbResults: z.number().optional().describe('Number of results to return (max 100)'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type to emulate'),
      additionalParams: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional Google search parameters (e.g., gl, hl, tbs)')
    })
  )
  .output(
    z.object({
      results: z
        .any()
        .describe(
          'Structured Google search results as JSON, including organic results, ads, knowledge graph, and other features'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.googleSearch({
      search: ctx.input.query,
      searchType: ctx.input.searchType,
      language: ctx.input.language,
      countryCode: ctx.input.countryCode,
      location: ctx.input.location,
      nbResults: ctx.input.nbResults,
      page: ctx.input.page,
      device: ctx.input.device,
      additionalParams: ctx.input.additionalParams
    });

    return {
      output: {
        results: result
      },
      message: `Google ${ctx.input.searchType || 'web'} search completed for **"${ctx.input.query}"**.`
    };
  });
