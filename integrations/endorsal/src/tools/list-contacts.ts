import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactListOutputSchema, mapContact } from '../lib/schemas';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve a list of contacts from your Endorsal CRM. Contacts are customer records used in review request campaigns. Use this to browse your contact database or find specific customers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of contacts to return'),
      page: z
        .number()
        .optional()
        .describe(
          'Positive whole-number page, starting at 1. Pagination is applied to the complete API response.'
        )
    })
  )
  .output(contactListOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContacts({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let contacts = result.data.map(mapContact);

    return {
      output: {
        contacts,
        total: result.total
      },
      message: `Found **${contacts.length}** contact(s)${result.total ? ` out of ${result.total} total` : ''}.`
    };
  })
  .build();
