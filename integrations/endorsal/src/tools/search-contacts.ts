import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactListOutputSchema, mapContact, searchQuerySchema } from '../lib/schemas';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description:
    'Find Endorsal contacts using field comparisons, email matches, name patterns, or custom attributes. Multiple conditions are combined with AND.',
  tags: { readOnly: true }
})
  .input(z.object({ query: searchQuerySchema }))
  .output(contactListOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).searchContacts(ctx.input.query);
    let contacts = result.data.map(mapContact);
    return {
      output: { contacts, total: result.total },
      message: `Found **${contacts.length}** matching contact(s).`
    };
  })
  .build();
