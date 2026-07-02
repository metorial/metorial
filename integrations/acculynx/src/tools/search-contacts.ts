import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchContactsTool = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search for contacts in AccuLynx by a text query. Returns paginated results matching the search criteria.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query text'),
      pageSize: z.number().optional().describe('Number of items per page'),
      pageStartIndex: z.number().optional().describe('Index of the first element to return')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of matching contact objects'),
      totalCount: z.number().optional().describe('Total number of matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchContacts({
      query: ctx.input.query,
      pageSize: ctx.input.pageSize,
      pageStartIndex: ctx.input.pageStartIndex
    });

    let contacts = Array.isArray(result)
      ? result
      : (result?.items ?? result?.data ?? [result]);
    let totalCount = result?.totalCount ?? result?.total ?? contacts.length;

    return {
      output: { contacts, totalCount },
      message: `Found **${contacts.length}** contacts matching query "${ctx.input.query ?? ''}".`
    };
  })
  .build();
