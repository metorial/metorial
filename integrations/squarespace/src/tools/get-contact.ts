import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a specific Squarespace contact by ID from the current Contacts API, including name, locale, primary email, marketing preference metadata, and default shipping address when available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('The unique identifier of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique contact identifier'),
      contact: z.any().describe('Complete contact data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let contact = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: contact.id || ctx.input.contactId,
        contact
      },
      message: `Retrieved contact **${contact.primaryEmail?.email || contact.id || ctx.input.contactId}**.`
    };
  })
  .build();
