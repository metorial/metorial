import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerigonClient } from '../lib/client';
import { spec } from '../spec';

let wikipediaPageSchema = z.object({
  title: z.string().describe('Page title'),
  summary: z.string().describe('Page summary'),
  content: z.string().describe('Full page content'),
  pageviews: z.number().describe('Daily pageview count'),
  wikidataId: z.string().describe('Wikidata entity ID'),
  wikiCode: z.string().describe('Wikipedia language code'),
  wikiRevisionTs: z.string().describe('Last revision timestamp (ISO 8601)'),
  wikidataInstanceOf: z.array(z.string()).describe('Wikidata instance-of classifications'),
  categories: z.array(z.string()).describe('Wikipedia categories')
});

export let searchWikipedia = SlateTool.create(spec, {
  name: 'Search Wikipedia',
  key: 'search_wikipedia',
  description: `Search Wikipedia pages for information on any topic. Returns page summaries, full content, categories, pageview data, and Wikidata metadata. Supports filtering by language, pageview threshold, Wikidata entity type, and Wikipedia category.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search keywords'),
      language: z.string().optional().describe('Wikipedia language code (e.g. "en", "es")'),
      pageviewsFrom: z.number().optional().describe('Minimum daily pageviews threshold'),
      wikidataId: z.string().optional().describe('Filter by specific Wikidata entity ID'),
      wikidataInstanceOfLabel: z
        .string()
        .optional()
        .describe('Filter by Wikidata instance type (e.g. "academic discipline")'),
      category: z
        .string()
        .optional()
        .describe('Filter by Wikipedia category (e.g. "Computer science")'),
      withPageviews: z.boolean().optional().describe('Only return pages with pageview data'),
      sortBy: z.string().optional().describe('Sort order (e.g. "relevance")'),
      page: z.number().optional().describe('Page number (zero-based)'),
      size: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      numResults: z.number().describe('Total number of matching pages'),
      pages: z.array(wikipediaPageSchema).describe('List of matching Wikipedia pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);

    let result = await client.searchWikipedia({
      q: ctx.input.query,
      language: ctx.input.language,
      pageviewsFrom: ctx.input.pageviewsFrom,
      wikidataId: ctx.input.wikidataId,
      wikidataInstanceOfLabel: ctx.input.wikidataInstanceOfLabel,
      category: ctx.input.category,
      withPageviews: ctx.input.withPageviews,
      sortBy: ctx.input.sortBy,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let pages = (result.results || []).map(p => ({
      title: p.title || '',
      summary: p.summary || '',
      content: p.content || '',
      pageviews: p.pageviews || 0,
      wikidataId: p.wikidataId || '',
      wikiCode: p.wikiCode || '',
      wikiRevisionTs: p.wikiRevisionTs || '',
      wikidataInstanceOf: p.wikidataInstanceOf || [],
      categories: p.categories || []
    }));

    return {
      output: {
        numResults: result.numResults || 0,
        pages
      },
      message: `Found **${result.numResults || 0}** Wikipedia pages matching "${ctx.input.query}" (showing ${pages.length}).`
    };
  })
  .build();
