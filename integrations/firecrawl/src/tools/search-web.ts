import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    'Set scrapeContent to true or provide formats to scrape full content for each result.'
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
      searchTimeout: z.number().optional().describe('Search request timeout in milliseconds'),
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

    let result = await client.search({
      query: ctx.input.query,
      limit: ctx.input.limit,
      sources: ctx.input.sources?.map(type => ({ type })),
      categories: ctx.input.categories?.map(type => ({ type })),
      includeDomains: ctx.input.includeDomains,
      excludeDomains: ctx.input.excludeDomains,
      location: ctx.input.location,
      country: ctx.input.country,
      tbs: ctx.input.timeFilter,
      timeout: ctx.input.searchTimeout,
      ignoreInvalidURLs: ctx.input.ignoreInvalidURLs,
      enterprise: ctx.input.enterprise,
      scrapeOptions: Object.keys(scrapeOptions).length > 0 ? (scrapeOptions as any) : undefined
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
