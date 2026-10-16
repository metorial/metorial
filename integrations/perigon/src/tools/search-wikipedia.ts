import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerigonClient } from '../lib/client';
import { formatWikipedia } from '../lib/responses';
import { spec } from '../spec';

let wikipediaPageSchema = z
  .object({
    title: z.string().describe('Page title'),
    summary: z.string().describe('Page summary'),
    content: z.string().describe('Available page section text combined in section order'),
    pageviews: z.number().describe('Daily pageview count'),
    wikidataId: z.string().describe('Wikidata entity ID'),
    wikiCode: z.string().describe('Wikipedia language code'),
    wikiRevisionTs: z.string().describe('Last revision timestamp (ISO 8601)'),
    wikidataInstanceOf: z.array(z.string()).describe('Wikidata instance-of classifications'),
    categories: z.array(z.string()).describe('Wikipedia categories')
  })
  .partial();

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
      title: z.string().optional().describe('Search within Wikipedia page titles'),
      pageviewsTo: z.number().optional().describe('Maximum daily pageview threshold'),
      wikiRevisionFrom: z
        .string()
        .optional()
        .describe('Only pages modified on or after this ISO 8601 date'),
      wikiRevisionTo: z
        .string()
        .optional()
        .describe('Only pages modified on or before this ISO 8601 date'),
      query: z.string().describe('Search keywords'),
      language: z
        .string()
        .optional()
        .describe('Wikipedia project code (currently enwiki); en is accepted as shorthand'),
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
      raw: z
        .record(z.string(), z.unknown())
        .describe('Complete provider response, including unavailable enrichment values'),
      numResults: z.number().describe('Total number of matching pages'),
      pages: z.array(wikipediaPageSchema).describe('List of matching Wikipedia pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);

    let result = await client.searchWikipedia({
      title: ctx.input.title,
      pageviewsTo: ctx.input.pageviewsTo,
      wikiRevisionFrom: ctx.input.wikiRevisionFrom,
      wikiRevisionTo: ctx.input.wikiRevisionTo,
      q: ctx.input.query,
      wikiCode: ctx.input.language === 'en' ? 'enwiki' : ctx.input.language,
      pageviewsFrom: ctx.input.pageviewsFrom,
      wikidataId: ctx.input.wikidataId,
      wikidataInstanceOfLabel: ctx.input.wikidataInstanceOfLabel,
      category: ctx.input.category,
      withPageviews: ctx.input.withPageviews,
      sortBy: ctx.input.sortBy,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let pages = result.results.map(formatWikipedia);

    return {
      output: {
        raw: result,
        numResults: result.numResults,
        pages
      },
      message: `Found **${result.numResults}** Wikipedia pages matching "${ctx.input.query}" (showing ${pages.length}).`
    };
  })
  .build();
