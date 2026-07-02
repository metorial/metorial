import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let authorSchema = z
  .object({
    authorId: z.string().nullable().optional().describe('Semantic Scholar author ID'),
    name: z.string().nullable().optional().describe('Author name'),
    url: z.string().nullable().optional().describe('Semantic Scholar profile URL'),
    affiliations: z.array(z.string()).nullable().optional().describe('Author affiliations'),
    homepage: z.string().nullable().optional().describe('Author homepage URL'),
    paperCount: z.number().nullable().optional().describe('Total number of papers'),
    citationCount: z.number().nullable().optional().describe('Total citation count'),
    hIndex: z.number().nullable().optional().describe('h-index'),
    externalIds: z
      .record(z.string(), z.any())
      .nullable()
      .optional()
      .describe('External IDs (e.g. ORCID, DBLP)')
  })
  .passthrough();

export let searchAuthors = SlateTool.create(spec, {
  name: 'Search Authors',
  key: 'search_authors',
  description: `Search for academic authors by name. Returns matching author profiles with metadata including affiliations, paper count, citation count, and h-index.
Use the **fields** parameter to control which author metadata is returned.`,
  constraints: ['Maximum 1,000 results per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Author name to search for'),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to return (e.g. "name,affiliations,paperCount,citationCount,hIndex,homepage,url,externalIds"). Defaults to "authorId,name".'
        ),
      offset: z.number().optional().describe('Pagination offset (default: 0)'),
      limit: z
        .number()
        .optional()
        .describe('Number of results per page (default: 100, max: 1000)')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching authors'),
      offset: z.number().optional().describe('Current pagination offset'),
      next: z.number().optional().describe('Next offset value for pagination'),
      authors: z.array(authorSchema).describe('List of matching authors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchAuthors(ctx.input.query, {
      fields: ctx.input.fields,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let authors = result.data || [];

    return {
      output: {
        total: result.total ?? 0,
        offset: result.offset,
        next: result.next,
        authors
      },
      message: `Found **${result.total ?? 0}** authors matching "${ctx.input.query}". Returned **${authors.length}** in this page.`
    };
  })
  .build();
