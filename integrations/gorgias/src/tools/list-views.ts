import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listViews = SlateTool.create(spec, {
  name: 'List Views',
  key: 'list_views',
  description:
    'List ticket views and discover view IDs to filter list_tickets using saved queue filters.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .refine(Number.isInteger, 'Use a whole number')
        .optional()
        .describe('Maximum views to return, from 1 to 100; default 30'),
      category: z.enum(['system', 'user']).optional().describe('Filter system or user views')
    })
  )
  .output(
    z.object({
      views: z.array(
        z.object({
          viewId: z.number().describe('View ID for filtering tickets'),
          name: z.string().describe('View name'),
          category: z.string().nullable().describe('View category'),
          filters: z.string().nullable().describe('Saved ticket filter expression'),
          visibility: z.string().nullable().describe('View visibility'),
          createdDatetime: z.string().nullable().describe('Creation time')
        })
      ),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      prevCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx.config, ctx.auth).listViews(ctx.input);
    let views = result.data.map(view => ({
      viewId: view.id,
      name: view.name,
      category: view.category ?? null,
      filters: view.filters ?? null,
      visibility: view.visibility ?? null,
      createdDatetime: view.created_datetime ?? null
    }));
    return {
      output: {
        views,
        nextCursor: result.meta?.next_cursor ?? null,
        prevCursor: result.meta?.prev_cursor ?? null
      },
      message: `Found ${views.length} view(s).`
    };
  })
  .build();
