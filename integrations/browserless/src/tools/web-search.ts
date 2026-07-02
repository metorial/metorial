import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { spec } from '../spec';

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Perform a web search and optionally scrape each result page. Returns structured search results with titles, URLs, and descriptions. When scraping is enabled, each result URL is fetched and processed into clean markdown, raw HTML, or other formats. Supports multiple sources (web, news, images), language filtering, time-based filtering, and category filters.`,
  instructions: [
    'Use scrapeFormats to have each result page fetched and converted to markdown or other formats.',
    'Set onlyMainContent to true when scraping to extract just the primary article content.'
  ],
  constraints: ['Only available on Cloud plans.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query'),
      sources: z
        .array(z.enum(['web', 'news', 'images']))
        .optional()
        .describe('Search sources to query'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      lang: z
        .string()
        .optional()
        .describe('Language code (e.g., "en", "es", "de", "fr", "ja")'),
      categories: z
        .array(z.string())
        .optional()
        .describe('Category filters (e.g., "github", "research", "pdf")'),
      timeFilter: z
        .string()
        .optional()
        .describe('Time-based filter (e.g., "month" for recent results)'),
      scrapeFormats: z
        .array(z.enum(['markdown', 'html', 'links', 'screenshot']))
        .optional()
        .describe('Formats to process each result page into'),
      onlyMainContent: z
        .boolean()
        .optional()
        .describe('Extract only the main content when scraping')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the search was successful'),
      totalResults: z.number().optional().describe('Total number of results found'),
      results: z
        .array(
          z.object({
            title: z.string().optional().describe('Result title'),
            url: z.string().optional().describe('Result URL'),
            description: z.string().optional().describe('Result snippet/description'),
            position: z.number().optional().describe('Result position in search results'),
            markdown: z.string().optional().describe('Scraped content in markdown format'),
            htmlContent: z.string().optional().describe('Scraped raw HTML content'),
            links: z
              .array(
                z.object({
                  text: z.string().optional(),
                  href: z.string().optional()
                })
              )
              .optional()
              .describe('Extracted links from the result page')
          })
        )
        .describe('Search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let input = ctx.input;
    let response = await client.search({
      query: input.query,
      sources: input.sources,
      limit: input.limit,
      lang: input.lang,
      categories: input.categories,
      tbs: input.timeFilter,
      scrapeOptions: input.scrapeFormats
        ? {
            formats: input.scrapeFormats,
            onlyMainContent: input.onlyMainContent
          }
        : undefined
    });

    let webResults = response?.data?.web ?? response?.data ?? [];
    let results = (Array.isArray(webResults) ? webResults : []).map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description,
      position: r.position,
      markdown: r.markdown,
      htmlContent: r.html,
      links: r.links
    }));

    return {
      output: {
        success: response?.success ?? true,
        totalResults: response?.totalResults ?? results.length,
        results
      },
      message: `Search for "${input.query}" returned **${results.length}** result(s).`
    };
  })
  .build();
