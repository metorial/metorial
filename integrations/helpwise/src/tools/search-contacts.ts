import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search across all contacts in your Helpwise account by name, email, phone, or other attributes. Returns matching contacts with their full details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search term to match against contact fields'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      contacts: z.array(z.record(z.string(), z.any())).describe('List of matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchContacts({
      query: ctx.input.query,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let contacts = Array.isArray(result) ? result : (result.contacts ?? result.data ?? []);

    return {
      output: { contacts },
      message: `Found ${contacts.length} contact(s) matching "${ctx.input.query}".`
    };
  })
  .build();
