import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `List all collections in the Hex workspace. Collections are organizational containers for projects. Returns one page with collection names and descriptions when supplied by Hex.`,
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
      before: z
        .string()
        .optional()
        .describe('Previous-page cursor; do not combine with after'),
      sortBy: z
        .enum(['CREATED_AT', 'NAME'])
        .optional()
        .describe(
          'NAME is supported. The retained CREATED_AT value is unsupported by the current collection API.'
        ),
      sortDirection: z
        .enum(['ASC', 'DESC'])
        .optional()
        .describe(
          'Retained legacy field; the current collection API does not support it. Omit sortDirection.'
        )
    })
  )
  .output(
    z.object({
      collections: z.array(
        z.object({
          collectionId: z.string(),
          name: z.string(),
          description: z.string().nullable().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      returnedCount: z.number().optional(),
      previousCursor: z.string().optional(),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl
    });

    let result = await client.listCollections({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let collections = result.values;

    return {
      output: {
        collections,
        returnedCount: result.values.length,
        previousCursor: result.pagination.before,
        nextCursor: result.pagination.after
      },
      message: `Found **${collections.length}** collection(s).${result.pagination?.after ? ' More results available.' : ''}`
    };
  })
  .build();
