import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchSerp = SlateTool.create(spec, {
  name: 'Search SERP',
  key: 'search_serp',
  description: `Perform a real-time search engine results page (SERP) query against Google, Bing, or Yahoo. Returns structured results including organic listings, ads, knowledge cards, People Also Ask, related searches, and more. Supports web, image, news, and shopping search types across desktop, mobile, and tablet devices with location and language targeting.`,
  instructions: [
    'Use the location fields (loc or locId) for geo-targeted results. Use "search_locations" tool to find valid locations.',
    'Set serpType to "web" for standard search results, "news" for news results, "image" for image results, or "shop" for shopping results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query keyword or phrase'),
      domain: z
        .string()
        .describe('Search engine domain, e.g. "google.com", "bing.com", "yahoo.com"'),
      lang: z.string().default('en').describe('Language code, e.g. "en", "fr", "de"'),
      device: z
        .enum(['desktop', 'mobile', 'tablet'])
        .default('desktop')
        .describe('Device type for results'),
      serpType: z
        .enum(['web', 'news', 'image', 'shop'])
        .default('web')
        .describe('Type of search results to retrieve'),
      loc: z
        .string()
        .optional()
        .describe('Location name, e.g. "Alba,Texas,United States". Use either loc or locId.'),
      locId: z
        .number()
        .optional()
        .describe('Location ID from the locations list. Use either loc or locId.'),
      verbatim: z
        .boolean()
        .optional()
        .describe('Enable Google verbatim (exact match) search mode'),
      filterSimilarResults: z
        .boolean()
        .optional()
        .describe('Filter similar and omitted results (default: enabled)'),
      page: z.number().optional().describe('Page number of results (default: 1)'),
      numResults: z.number().optional().describe('Number of results per page (default: 100)'),
      dateRange: z
        .string()
        .optional()
        .describe(
          'Date filter: "h" (hour), "d" (day), "w" (week), "m" (month), "y" (year), or "YYYY-MM-DD,YYYY-MM-DD"'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      message: z.string().describe('Response message'),
      searchMetadata: z.any().optional().describe('Metadata about the search request'),
      searchParameters: z.any().optional().describe('Echo of the search parameters used'),
      results: z
        .any()
        .optional()
        .describe('Structured SERP results including organic, ads, knowledge cards, etc.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.liveSearch({
      q: ctx.input.query,
      domain: ctx.input.domain,
      lang: ctx.input.lang,
      device: ctx.input.device,
      serp_type: ctx.input.serpType,
      ...(ctx.input.loc ? { loc: ctx.input.loc } : {}),
      ...(ctx.input.locId ? { loc_id: ctx.input.locId } : {}),
      ...(ctx.input.verbatim !== undefined ? { verbatim: ctx.input.verbatim ? 1 : 0 } : {}),
      ...(ctx.input.filterSimilarResults !== undefined
        ? { gfilter: ctx.input.filterSimilarResults ? 1 : 0 }
        : {}),
      ...(ctx.input.page ? { page: ctx.input.page } : {}),
      ...(ctx.input.numResults ? { num_result: ctx.input.numResults } : {}),
      ...(ctx.input.dateRange ? { date_range: ctx.input.dateRange } : {})
    });

    let resultsData = response?.results;
    let organicCount = resultsData?.results?.organic?.length ?? 0;

    return {
      output: {
        status: response?.status ?? 'unknown',
        message: response?.msg ?? '',
        searchMetadata: resultsData?.search_metadata,
        searchParameters: resultsData?.search_parameters,
        results: resultsData?.results
      },
      message: `SERP search for **"${ctx.input.query}"** on **${ctx.input.domain}** (${ctx.input.serpType}, ${ctx.input.device}) returned **${organicCount}** organic results.`
    };
  })
  .build();
