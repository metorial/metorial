import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLists = SlateTool.create(spec, {
  name: 'List Lists',
  key: 'list_lists',
  description: `Retrieve all lists (tag groups) within a brand. Returns list names and whether each is the system-generated "all contacts" list.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of lists to return (1-100). Defaults to 10.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      hasMore: z.boolean().describe('Whether more lists exist beyond this page'),
      cursor: z.string().describe('Cursor for fetching the next page'),
      total: z.number().describe('Total number of lists'),
      lists: z.array(
        z.object({
          listId: z.string().describe('List unique identifier'),
          name: z.string().describe('List name'),
          isAllContacts: z
            .boolean()
            .describe('Whether this is the system list containing all contacts'),
          createdAt: z.string().describe('Creation timestamp (ISO 8601)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listLists(ctx.input.brandId, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let lists = result.data.map(l => ({
      listId: l.id,
      name: l.name,
      isAllContacts: l.all,
      createdAt: new Date(l.created * 1000).toISOString()
    }));

    return {
      output: {
        hasMore: result.has_more,
        cursor: result.cursor,
        total: result.total,
        lists
      },
      message: `Found **${result.total}** list(s). Returned **${lists.length}** list(s)${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
