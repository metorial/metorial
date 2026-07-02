import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { contactOutputSchema, mapContact } from '../lib/schemas';
import { spec } from '../spec';

export let getContactTool = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact by its ID. Returns full contact details including name, linked leads, tags, and custom fields.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to retrieve')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let contact = await client.getContact(ctx.input.contactId);

    return {
      output: mapContact(contact),
      message: `Retrieved contact **${contact.name}** (ID: ${contact.id}).`
    };
  })
  .build();
