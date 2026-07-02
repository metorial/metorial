import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContactLists = SlateTool.create(spec, {
  name: 'List Contact Lists',
  key: 'list_contact_lists',
  description: `List and search contact lists in your Benchmark Email account. Returns list metadata including name, contact count, status, and creation date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search lists by name'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.string().describe('Unique ID of the contact list'),
            name: z.string().describe('List name'),
            contactCount: z.number().describe('Number of contacts in the list'),
            status: z.string().describe('Approval status of the list'),
            createdDate: z.string().describe('Date the list was created'),
            modifiedDate: z.string().describe('Date the list was last modified')
          })
        )
        .describe('List of contact lists'),
      totalCount: z.number().describe('Total number of matching lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContactLists({
      searchFilter: ctx.input.search,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let lists = (result?.Data ?? []).map((l: any) => ({
      listId: String(l.ID ?? ''),
      name: String(l.Name ?? ''),
      contactCount: Number(l.ContactCount ?? 0),
      status: String(l.Status ?? ''),
      createdDate: String(l.CreatedDate ?? ''),
      modifiedDate: String(l.ModifiedDate ?? '')
    }));

    return {
      output: {
        lists,
        totalCount: Number(result?.Count ?? lists.length)
      },
      message: `Found **${lists.length}** contact list(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
