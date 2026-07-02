import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve all contacts within a specific calling list. Returns contact details including name, phone, email, company, notes, and assignment information. Use the **List Calling Lists** tool first to get the list ID if you don't already have one.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the calling list to retrieve contacts from')
    })
  )
  .output(
    z.object({
      contacts: z.array(z.any()).describe('Array of contacts in the list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let contacts = await client.getContacts(ctx.input.listId);

    return {
      output: { contacts },
      message: `Retrieved **${Array.isArray(contacts) ? contacts.length : 0}** contact(s) from list \`${ctx.input.listId}\`.`
    };
  })
  .build();
