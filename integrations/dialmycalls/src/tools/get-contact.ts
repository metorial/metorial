import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactOutputSchema, formatContact } from '../lib/contact';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description:
    'Retrieve a contact by ID, including its details and contact group membership. Use list_contacts to discover contact IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID. Use list_contacts to find contact IDs.')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let contact = await client.getContact(ctx.input.contactId);
    return {
      output: formatContact(contact),
      message: `Retrieved contact \`${contact.id ?? ctx.input.contactId}\`.`
    };
  })
  .build();
