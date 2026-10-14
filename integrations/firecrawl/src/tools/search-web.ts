import { ServiceError } from '@lowerdeck/error';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { firecrawlServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  buildNestedScrapeOptions,
  commonScrapeInputShape,
  normalizePageData,
  requireNoDomainConflict
} from './shared';

let searchResultSchema = z.object({
  url: z.string().optional().describe('URL of the search result'),
  title: z.string().optional().describe('Title of the search result'),
  description: z.string().optional().describe('Snippet/description of the search result'),
  category: z.string().optional().describe('Search category if returned'),
  date: z.string().optional().describe('Date for news results if returned'),
  imageUrl: z.string().optional().describe('Image URL for image or news results'),
  imageWidth: z.number().optional().describe('Image width'),
  imageHeight: z.number().optional().describe('Image height'),
  position: z.number().optional().describe('Search result position'),
  markdown: z.string().optional().describe('Scraped markdown when scrape options are used'),
  html: z.string().optional().describe('Scraped HTML when requested'),
  rawHtml: z.string().optional().describe('Raw HTML when requested'),
  links: z.array(z.string()).optional().describe('Links when requested'),
  metadata: z.any().optional().describe('Scrape metadata when returned')
});

// Firecrawl defaults search to a 60s timeout, which outlives the tool runtime limit when
// many results are scraped. Bound it so Firecrawl answers before the runtime gives up.
let MAX_SEARCH_TIMEOUT_MS = 20_000;

let mapSearchItem = (item: any) => ({
  url: item.url,
  title: item.title,
  description: item.description ?? item.snippet,
  category: item.category,
  date: item.date,
  imageUrl: item.imageUrl,
  imageWidth: item.imageWidth,
  imageHeight: item.imageHeight,
  position: item.position,
  ...normalizePageData(item)
});

export let searchWebTool = SlateTool.create(spec, {
  name: 'Search Web',
  key: 'search_web',
  description: `Search the web with Firecrawl v2 and optionally scrape search results. Supports web, image, and news sources; domain filters; time/location filters; categories; and scrape options for full result content.`,
  instructions: [
    'Use this when you need to discover relevant pages before scraping.',
    'Use includeDomains or excludeDomains, not both.',
    'Set scrapeContent to true or provide formats to scrape full content for each result.',
    'Scraping many results is slow; keep limit small (about 10 or fewer) when scraping content, and scrape additional pages separately.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Search query, max 500 characters. Supports operators like quotes, site:, filetype:, intitle:, and inurl:.'
        ),
      limit: z.number().optional().describe('Number of results per source, max 100'),
      sources: z
        .array(z.enum(['web', 'images', 'news']))
        .optional()
        .describe('Sources to search. Defaults to web.'),
      categories: z
        .array(z.enum(['github', 'research', 'pdf']))
        .optional()
        .describe('Filter web results by category'),
      includeDomains: z
        .array(z.string())
        .optional()
        .describe('Restrict search results to hostnames, without protocol or path'),
      excludeDomains: z
        .array(z.string())
        .optional()
        .describe('Exclude search results from hostnames, without protocol or path'),
      location: z
        .string()
        .optional()
        .describe('Geo-target results, e.g. San Francisco,California,United States'),
      country: z.string().optional().describe('ISO country code for search results'),
      timeFilter: z
        .string()
        .optional()
        .describe('Time-based filter, e.g. qdr:d, qdr:w, qdr:m, or custom cdr format'),
      searchTimeout: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          `Search request timeout in milliseconds. Defaults to and is capped at ${MAX_SEARCH_TIMEOUT_MS}.`
        ),
      ignoreInvalidURLs: z.boolean().optional().describe('Filter invalid scrape URLs'),
      enterprise: z
        .array(z.enum(['anon', 'zdr']))
        .optional()
        .describe('Enterprise search options if enabled for the team'),
      scrapeContent: z
        .boolean()
        .optional()
        .describe('If true and no formats are specified, scrape markdown for each web result'),
      ...commonScrapeInputShape
    })
  )
  .output(
    z.object({
      searchId: z.string().optional().describe('Firecrawl search job ID'),
      web: z.array(searchResultSchema).describe('Web search results'),
      images: z.array(searchResultSchema).optional().describe('Image search results'),
      news: z.array(searchResultSchema).optional().describe('News search results'),
      warning: z.string().optional().describe('Warning returned by Firecrawl'),
      creditsUsed: z.number().optional().describe('Credits consumed by the search')
    })
  )
  .handleInvocation(async ctx => {
    requireNoDomainConflict(ctx.input);

    let client = new Client({ token: ctx.auth.token });
    let scrapeOptions = buildNestedScrapeOptions({
      ...ctx.input,
      formats: ctx.input.scrapeContent && !ctx.input.formats ? ['markdown'] : ctx.input.formats
    });

    let timeout = Math.min(
      ctx.input.searchTimeout ?? MAX_SEARCH_TIMEOUT_MS,
      MAX_SEARCH_TIMEOUT_MS
    );
    let scraping = Object.keys(scrapeOptions).length > 0;

    let result = await client
      .search({
        query: ctx.input.query,
        limit: ctx.input.limit,
        sources: ctx.input.sources?.map(type => ({ type })),
        categories: ctx.input.categories?.map(type => ({ type })),
        includeDomains: ctx.input.includeDomains,
        excludeDomains: ctx.input.excludeDomains,
        location: ctx.input.location,
        country: ctx.input.country,
        tbs: ctx.input.timeFilter,
        timeout,
        ignoreInvalidURLs: ctx.input.ignoreInvalidURLs,
        enterprise: ctx.input.enterprise,
        scrapeOptions: scraping ? (scrapeOptions as any) : undefined
      })
      .catch(error => {
        if (error instanceof ServiceError && error.data.upstreamStatus === 408) {
          let timeoutError = firecrawlServiceError(
            `Firecrawl search timed out after ${timeout}ms.${
              scraping
                ? ' Scraping many results takes too long; lower limit (for example 10 or fewer) or set scrapeContent to false and scrape selected pages separately.'
                : ' Try a narrower query or a lower limit.'
            }`
          );
          timeoutError.data.reason = error.data.reason;
          timeoutError.data.upstreamStatus = error.data.upstreamStatus;
          timeoutError.data.upstreamCode = error.data.upstreamCode;
          timeoutError.setParent(error);
          throw timeoutError;
        }
        throw error;
      });

    let data = result.data ?? {};
    let web = (Array.isArray(data.web) ? data.web : Array.isArray(data) ? data : []).map(
      mapSearchItem
    );
    let images = Array.isArray(data.images) ? data.images.map(mapSearchItem) : undefined;
    let news = Array.isArray(data.news) ? data.news.map(mapSearchItem) : undefined;

    return {
      output: {
        searchId: result.id,
        web,
        images,
        news,
        warning: result.warning,
        creditsUsed: result.creditsUsed
      },
      message: `Found **${web.length}** web result(s) for "${ctx.input.query}".`
    };
  });
