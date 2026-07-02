import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLists = SlateTool.create(spec, {
  name: 'Get Lists',
  key: 'get_lists',
  description: `Retrieve subscriber lists from your Doppler account. Returns list details including subscriber counts and creation dates.
Supports fetching all lists or a specific list by ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z
        .number()
        .optional()
        .describe(
          'If provided, fetches a single list by its ID. Otherwise returns all lists.'
        ),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of items per page (max 20)')
    })
  )
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.number().describe('Unique identifier of the list'),
            name: z.string().describe('Name of the list'),
            currentStatus: z.string().describe('Current status of the list'),
            subscribersCount: z.number().describe('Number of subscribers in the list'),
            creationDate: z.string().describe('Date the list was created')
          })
        )
        .describe('Array of subscriber lists'),
      totalCount: z.number().describe('Total number of lists'),
      currentPage: z.number().optional().describe('Current page number'),
      pagesCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.config.accountEmail
    });

    if (ctx.input.listId !== undefined) {
      let list = await client.getList(ctx.input.listId);
      return {
        output: {
          lists: [
            {
              listId: list.listId,
              name: list.name,
              currentStatus: list.currentStatus,
              subscribersCount: list.subscribersCount,
              creationDate: list.creationDate
            }
          ],
          totalCount: 1
        },
        message: `Found list **${list.name}** with ${list.subscribersCount} subscribers.`
      };
    }

    let result = await client.getLists(ctx.input.page, ctx.input.pageSize);
    let lists = (result.items ?? []).map(l => ({
      listId: l.listId,
      name: l.name,
      currentStatus: l.currentStatus,
      subscribersCount: l.subscribersCount,
      creationDate: l.creationDate
    }));

    return {
      output: {
        lists,
        totalCount: result.itemsCount,
        currentPage: result.currentPage,
        pagesCount: result.pagesCount
      },
      message: `Found **${result.itemsCount}** lists (page ${result.currentPage} of ${result.pagesCount}).`
    };
  })
  .build();
