import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let googleScholar = SlateTool.create(spec, {
  name: 'Google Scholar Search',
  key: 'google_scholar_search',
  description: `Search Google Scholar for academic papers, articles, and citations. Also supports looking up author profiles, articles, and co-authors by author ID.`,
  instructions: [
    'For author profiles, provide an `authorId` (e.g., "LSsXyncAAAAJ") to retrieve their details and articles.',
    'Use `yearFrom` and `yearTo` to filter results by publication year range.',
    'Use `citedBy` with an article ID to find papers that cite a specific article.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Scholar search query'),
      authorId: z
        .string()
        .optional()
        .describe('Google Scholar author ID for author profile lookup'),
      language: z.string().optional().describe('Language of results. Defaults to "en_us".'),
      numResults: z.number().optional().describe('Number of results per page'),
      page: z.number().optional().describe('Page offset (0, 10, 20, etc.)'),
      citedBy: z.string().optional().describe('Article ID to find papers that cite it'),
      yearFrom: z.string().optional().describe('Starting year to filter results'),
      yearTo: z.string().optional().describe('Ending year to filter results'),
      abstractOnly: z
        .boolean()
        .optional()
        .describe('Set to true to return only articles with abstracts'),
      cluster: z.string().optional().describe('Article ID to find all available versions'),
      excludeCitations: z
        .boolean()
        .optional()
        .describe('Set to true to exclude citations from results'),
      safeSearch: z
        .enum(['active', 'off'])
        .optional()
        .describe('Safe search filter. Defaults to "off".'),
      authorSort: z
        .enum(['title', 'pubdate'])
        .optional()
        .describe('Sort author articles by title or publication date'),
      authorViewCoauthors: z.boolean().optional().describe('View co-authors of the author'),
      citationId: z
        .string()
        .optional()
        .describe('Citation ID for fetching individual article citation details')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Google Scholar results or author profile')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.authorId) {
      let data = await client.googleScholarAuthor({
        authorId: ctx.input.authorId,
        sort: ctx.input.authorSort,
        viewOp: ctx.input.authorViewCoauthors
          ? 'list_colleagues'
          : ctx.input.citationId
            ? 'view_citation'
            : undefined,
        citationId: ctx.input.citationId
      });

      return {
        output: { results: data },
        message: `Fetched Google Scholar author profile for **${ctx.input.authorId}**.`
      };
    }

    if (!ctx.input.query) throw new Error('Either query or authorId is required');

    let data = await client.googleScholar({
      q: ctx.input.query,
      hl: ctx.input.language,
      num: ctx.input.numResults,
      page: ctx.input.page,
      cites: ctx.input.citedBy,
      asYlo: ctx.input.yearFrom,
      asYhi: ctx.input.yearTo,
      scisbd: ctx.input.abstractOnly ? '1' : undefined,
      cluster: ctx.input.cluster,
      asVis: ctx.input.excludeCitations ? '1' : undefined,
      safe: ctx.input.safeSearch
    });

    return {
      output: { results: data },
      message: `Searched Google Scholar for **"${ctx.input.query}"**.`
    };
  })
  .build();
