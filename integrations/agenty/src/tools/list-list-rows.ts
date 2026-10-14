import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listListRows = SlateTool.create(spec, {
  key: 'list_list_rows',
  name: 'List List Rows',
  description:
    'Retrieve rows in a reusable list, including their _id values for updating or deleting individual rows. Use manage_list with action list to discover list IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      listId: z
        .string()
        .min(1)
        .describe('List ID. Use manage_list with action list to discover list IDs.'),
      offset: z
        .number()
        .min(0)
        .refine(Number.isInteger, 'Use a whole-number offset.')
        .optional(),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .refine(Number.isInteger, 'Use a whole-number limit.')
        .optional(),
      sort: z.string().optional().describe('Column or field to sort by.'),
      order: z.enum(['asc', 'desc']).optional()
    })
  )
  .output(
    z.object({
      listId: z.string(),
      rows: z.array(z.record(z.string(), z.any())),
      total: z.number().optional().nullable(),
      returned: z.number(),
      offset: z.number().optional().nullable(),
      limit: z.number().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let { listId, ...params } = ctx.input;
    let result = await new Client({ token: ctx.auth.token }).listListRows(listId, params);
    let rows = Array.isArray(result.result) ? result.result : [];
    return {
      output: {
        listId,
        rows,
        total: result.total,
        returned: rows.length,
        offset: result.offset,
        limit: result.limit
      },
      message: `Retrieved **${rows.length}** rows from list **${listId}**.`
    };
  })
  .build();
