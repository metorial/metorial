import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve contacts from Squarespace's current Contacts API. Supports paginated listing and search for customer contacts, marketing subscribers, donors, and address book records.`,
  instructions: [
    'Use searchString to find contacts by name or email',
    'Use cursor from a previous response to retrieve the next page'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z
        .number()
        .optional()
        .describe('Maximum contacts to return, up to the provider limit'),
      searchString: z
        .string()
        .optional()
        .describe('Search text for matching contacts by name or email'),
      sortField: z.string().optional().describe('Provider-supported contact sort field'),
      sortDirection: z
        .enum(['ASCENDING', 'DESCENDING'])
        .optional()
        .describe('Sort direction for query results')
    })
  )
  .output(
    z.object({
      contacts: z.array(z.any()).describe('Array of contact records'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      nextPageCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContacts({
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      searchString: ctx.input.searchString,
      sortField: ctx.input.sortField,
      sortDirection: ctx.input.sortDirection
    });

    return {
      output: {
        contacts: result.contacts,
        hasNextPage: result.pagination.hasNextPage,
        nextPageCursor: result.pagination.nextPageCursor
      },
      message: `Retrieved **${result.contacts.length}** contact(s).${result.pagination.hasNextPage ? ' More results available via pagination.' : ''}`
    };
  })
  .build();
