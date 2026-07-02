import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact by ID, including all their details such as emails, phones, tags, address, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to retrieve')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let contact = await client.getContact(ctx.input.contactId);
    let name =
      [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
      contact.companyName ||
      'Unknown';

    return {
      output: contact,
      message: `Retrieved contact **${name}**.`
    };
  })
  .build();
