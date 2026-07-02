import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScrapeDoClient } from '../lib/client';
import { spec } from '../spec';

export let googleSearch = SlateTool.create(spec, {
  name: 'Google Search',
  key: 'google_search',
  description: `Search Google and get structured JSON results including organic results, ads, knowledge graphs, local packs, video results, and 15+ other result types. Supports 84 Google domains for regional targeting, localization via language and geo-location codes, desktop/mobile SERP layouts, SafeSearch, time-based filters, and pagination.`,
  instructions: [
    'Use gl for country-specific results (e.g., "us", "gb").',
    'Use hl to control the interface language (e.g., "en", "de").',
    'Use start for pagination (offset of results).',
    'Use tbs for time-based filtering (e.g., "qdr:d" for past day, "qdr:w" for past week).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The search query string'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type for SERP layout'),
      gl: z
        .string()
        .optional()
        .describe(
          'Country code for geo-location targeting (ISO 3166-1 alpha-2, e.g., "us", "gb")'
        ),
      hl: z.string().optional().describe('Host language code (e.g., "en", "de", "fr")'),
      cr: z
        .string()
        .optional()
        .describe('Country restriction filter for strict geo-filtering'),
      lr: z.string().optional().describe('Language restriction filter (e.g., "lang_en")'),
      location: z
        .string()
        .optional()
        .describe('Precise location string for targeting (e.g., "New York, NY")'),
      uule: z.string().optional().describe('UULE-encoded location for precise geo-targeting'),
      start: z
        .number()
        .optional()
        .describe('Pagination offset (0-based index of first result)'),
      num: z.number().optional().describe('Number of results per page'),
      safe: z.string().optional().describe('SafeSearch filter level'),
      tbs: z
        .string()
        .optional()
        .describe(
          'Time-based search filter (e.g., "qdr:d" for past day, "qdr:w" for past week, "qdr:m" for past month)'
        ),
      nfpr: z.string().optional().describe('Set to "1" to disable spell correction'),
      includeHtml: z.boolean().optional().describe('Include raw Google HTML in the response')
    })
  )
  .output(
    z.object({
      searchResults: z
        .any()
        .describe(
          'Structured JSON containing all search result types (organic, ads, knowledge graph, local pack, videos, etc.)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ScrapeDoClient(ctx.auth.token);
    let input = ctx.input;

    let results = await client.googleSearch({
      query: input.query,
      device: input.device,
      gl: input.gl,
      hl: input.hl,
      cr: input.cr,
      lr: input.lr,
      location: input.location,
      uule: input.uule,
      start: input.start,
      num: input.num,
      safe: input.safe,
      tbs: input.tbs,
      nfpr: input.nfpr,
      includeHtml: input.includeHtml
    });

    let resultSummary = '';
    if (results && typeof results === 'object') {
      let organicResults = results.organicResults as unknown[] | undefined;
      let ads = results.ads as unknown[] | undefined;
      resultSummary = `${organicResults?.length || 0} organic results`;
      if (ads && ads.length > 0) {
        resultSummary += `, ${ads.length} ads`;
      }
    }

    return {
      output: {
        searchResults: results
      },
      message: `Google search for **"${input.query}"** returned ${resultSummary}.${input.gl ? ` (geo: ${input.gl})` : ''}`
    };
  })
  .build();
