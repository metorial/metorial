import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts in List',
  key: 'search_contacts',
  description: `Search and retrieve contacts from a specific list in your Mailercloud account. Supports pagination and keyword search to filter contacts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to search contacts in'),
      search: z.string().optional().describe('Search keyword to filter contacts'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      limit: z.number().optional().describe('Number of contacts per page (default: 20)')
    })
  )
  .output(
    z
      .object({
        contacts: z
          .array(z.record(z.string(), z.unknown()))
          .describe('List of matching contacts'),
        totalCount: z.number().optional().describe('Total number of matching contacts')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchContacts(ctx.input.listId, {
      page: ctx.input.page,
      limit: ctx.input.limit,
      search: ctx.input.search
    });

    let data = result?.data ?? result;
    let contacts = Array.isArray(data) ? data : (data?.contacts ?? data?.data ?? []);
    let totalCount = result?.count ?? result?.total ?? contacts.length;

    return {
      output: {
        contacts,
        totalCount
      },
      message: `Found **${totalCount}** contact(s) in list \`${ctx.input.listId}\`.`
    };
  })
  .build();
