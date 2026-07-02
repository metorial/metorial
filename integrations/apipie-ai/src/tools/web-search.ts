import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search & Scrape',
  key: 'web_search',
  description: `Perform web searches and scrape web page content. Use search to find relevant web results for a query, and scrape to extract clean text content from specific URLs. These can be used independently or together.`,
  instructions: [
    'Use "action" set to "search" to perform a web search query and get ranked results.',
    'Use "action" set to "scrape" to extract text content from a specific URL.',
    'Use "action" set to "search_and_scrape" to search first, then automatically scrape the top results.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      action: z.enum(['search', 'scrape', 'search_and_scrape']).describe('Action to perform'),
      query: z
        .string()
        .optional()
        .describe('Search query (required for "search" and "search_and_scrape" actions)'),
      url: z.string().optional().describe('URL to scrape (required for "scrape" action)'),
      searchProvider: z
        .string()
        .optional()
        .describe('Search provider to use (e.g., "google")'),
      geo: z.string().optional().describe('Geographic location code (e.g., "us", "uk")'),
      lang: z.string().optional().describe('Language code (e.g., "en", "fr")'),
      results: z.number().optional().describe('Number of search results to return'),
      scrapeFormat: z.string().optional().describe('Scrape output format (e.g., "parsed")'),
      scrapeTopN: z
        .number()
        .optional()
        .describe(
          'Number of top search results to scrape (for "search_and_scrape" action, default 3)'
        )
    })
  )
  .output(
    z.object({
      searchResults: z
        .array(
          z.object({
            url: z.string().describe('Result URL'),
            title: z.string().describe('Result title'),
            description: z.string().optional().describe('Result snippet/description')
          })
        )
        .optional()
        .describe('Web search results'),
      scrapedContent: z
        .array(
          z.object({
            url: z.string().describe('Scraped page URL'),
            title: z.string().optional().describe('Page title'),
            textContent: z.string().optional().describe('Extracted text content'),
            excerpt: z.string().optional().describe('Short summary/excerpt')
          })
        )
        .optional()
        .describe('Scraped page content')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let searchResults: Array<{ url: string; title: string; description?: string }> | undefined;
    let scrapedContent:
      | Array<{ url: string; title?: string; textContent?: string; excerpt?: string }>
      | undefined;

    if (ctx.input.action === 'search' || ctx.input.action === 'search_and_scrape') {
      if (!ctx.input.query) {
        throw new Error('A "query" is required for search actions.');
      }

      let searchResult = await client.search({
        query: ctx.input.query,
        searchProvider: ctx.input.searchProvider,
        geo: ctx.input.geo,
        lang: ctx.input.lang,
        results: ctx.input.results
      });

      let mappedResults = (searchResult.results ?? []).map((r: any) => ({
        url: r.url as string,
        title: r.title as string,
        description: r.description as string | undefined
      }));
      searchResults = mappedResults;

      if (ctx.input.action === 'search_and_scrape' && mappedResults.length > 0) {
        let topN = ctx.input.scrapeTopN ?? 3;
        let urlsToScrape = mappedResults.slice(0, topN);

        scrapedContent = [];
        for (let result of urlsToScrape) {
          try {
            let scraped = await client.scrape({
              url: result.url,
              format: ctx.input.scrapeFormat ?? 'parsed'
            });
            scrapedContent.push({
              url: result.url,
              title: scraped.title,
              textContent: scraped.textContent,
              excerpt: scraped.excerpt
            });
          } catch {
            scrapedContent.push({
              url: result.url,
              title: result.title,
              textContent: undefined,
              excerpt: 'Failed to scrape this page.'
            });
          }
        }
      }
    } else if (ctx.input.action === 'scrape') {
      if (!ctx.input.url) {
        throw new Error('A "url" is required for the scrape action.');
      }

      let scraped = await client.scrape({
        url: ctx.input.url,
        format: ctx.input.scrapeFormat ?? 'parsed'
      });

      scrapedContent = [
        {
          url: ctx.input.url,
          title: scraped.title,
          textContent: scraped.textContent,
          excerpt: scraped.excerpt
        }
      ];
    }

    let messageParts: string[] = [];
    if (searchResults) {
      messageParts.push(
        `Found **${searchResults.length}** search result${searchResults.length !== 1 ? 's' : ''} for "${ctx.input.query}".`
      );
    }
    if (scrapedContent) {
      messageParts.push(
        `Scraped **${scrapedContent.length}** page${scrapedContent.length !== 1 ? 's' : ''}.`
      );
    }

    return {
      output: {
        searchResults,
        scrapedContent
      },
      message: messageParts.join(' ')
    };
  })
  .build();
