import { SlateTool } from 'slates';
import { z } from 'zod';
import { GammaClient } from '../lib/client';
import { spec } from '../spec';

export let searchGammasTool = SlateTool.create(spec, {
  name: 'Search Gammas',
  key: 'search_gammas',
  description:
    'Search accessible Gamma documents by title and body text, or browse documents using creator and last-updated filters. Returns file IDs for get_gamma.',
  instructions: [
    'Provide a query or at least one of createdBy, updatedAfter, and updatedBefore.',
    'Text searches are ranked by relevance; filter-only results are ordered by most recently updated.',
    'Search may return a temporary unavailable error; retry later.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Full-text search query matched against titles and body text'),
      createdBy: z
        .string()
        .optional()
        .describe('Creator filter: me, an email address, or a user ID'),
      updatedAfter: z.iso
        .datetime({ offset: true })
        .optional()
        .describe('Inclusive ISO-8601 lower bound for the last-updated time'),
      updatedBefore: z.iso
        .datetime({ offset: true })
        .optional()
        .describe('Inclusive ISO-8601 upper bound for the last-updated time'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived documents; defaults to false'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(25)
        .optional()
        .describe('Maximum results, from 1 to 25')
    })
  )
  .output(
    z.object({
      hits: z.array(
        z.object({
          id: z.string().describe('Gamma file ID for get_gamma'),
          title: z.string().nullable(),
          url: z.string(),
          highlight: z.string().nullable(),
          createdBy: z.string().nullable(),
          updatedTime: z.string().nullable(),
          archived: z.boolean()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GammaClient(ctx.auth.token);
    let result = await client.searchGammas({
      q: ctx.input.query,
      createdBy: ctx.input.createdBy,
      updatedAfter: ctx.input.updatedAfter,
      updatedBefore: ctx.input.updatedBefore,
      includeArchived: ctx.input.includeArchived,
      limit: ctx.input.limit
    });
    return {
      output: result,
      message: `Found **${result.hits.length}** Gamma document(s).`
    };
  });
