import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `List all collections in the Hex workspace. Collections are organizational containers for projects. Returns paginated results with collection names, descriptions, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100)'),
      after: z.string().optional().describe('Pagination cursor for the next page'),
      sortBy: z.enum(['CREATED_AT', 'NAME']).optional().describe('Field to sort by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      collections: z.array(
        z.object({
          collectionId: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listCollections({
      limit: ctx.input.limit,
      after: ctx.input.after,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let collections = result.values ?? [];

    return {
      output: {
        collections,
        nextCursor: result.pagination?.after
      },
      message: `Found **${collections.length}** collection(s).${result.pagination?.after ? ' More results available.' : ''}`
    };
  })
  .build();
