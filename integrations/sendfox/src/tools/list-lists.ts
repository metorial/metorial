import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLists = SlateTool.create(spec, {
  name: 'List Lists',
  key: 'list_lists',
  description: `Retrieve a paginated list of contact lists with subscriber counts and engagement metrics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      lists: z.array(
        z.object({
          listId: z.number().describe('List ID'),
          name: z.string().describe('List name'),
          subscribedContactsCount: z
            .number()
            .optional()
            .describe('Number of subscribed contacts'),
          averageEmailOpenPercent: z.string().optional().describe('Average email open rate'),
          averageEmailClickPercent: z.string().optional().describe('Average email click rate'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Last page number'),
      total: z.number().describe('Total number of lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listLists(ctx.input.page);

    return {
      output: {
        lists: result.data.map(l => ({
          listId: l.id,
          name: l.name,
          subscribedContactsCount: l.subscribed_contacts_count,
          averageEmailOpenPercent: l.average_email_open_percent,
          averageEmailClickPercent: l.average_email_click_percent,
          createdAt: l.created_at
        })),
        currentPage: result.current_page,
        lastPage: result.last_page,
        total: result.total
      },
      message: `Retrieved ${result.data.length} lists (page ${result.current_page} of ${result.last_page}, ${result.total} total).`
    };
  })
  .build();
