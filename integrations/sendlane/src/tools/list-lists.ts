import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listLists = SlateTool.create(spec, {
  name: 'List Lists',
  key: 'list_lists',
  description: `Retrieve all mailing lists in your Sendlane account. Lists are the primary groupings for organizing contacts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number for pagination'),
      perPage: z.number().optional().default(25).describe('Number of results per page')
    })
  )
  .output(
    z.object({
      lists: z.array(
        z.object({
          listId: z.number().describe('Sendlane list ID'),
          name: z.string().describe('List name'),
          contactCount: z.number().describe('Number of contacts in the list'),
          createdAt: z.string().describe('When the list was created'),
          updatedAt: z.string().describe('When the list was last updated')
        })
      ),
      currentPage: z.number(),
      lastPage: z.number(),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendlaneClient(ctx.auth.token);
    let result = await client.listLists(ctx.input.page, ctx.input.perPage);

    let lists = result.data.map(l => ({
      listId: l.id,
      name: l.name ?? '',
      contactCount: l.contact_count ?? 0,
      createdAt: l.created_at ?? '',
      updatedAt: l.updated_at ?? ''
    }));

    return {
      output: {
        lists,
        currentPage: result.pagination.currentPage,
        lastPage: result.pagination.lastPage,
        total: result.pagination.total
      },
      message: `Found **${lists.length}** lists (page ${result.pagination.currentPage} of ${result.pagination.lastPage}).`
    };
  })
  .build();
