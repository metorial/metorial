import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve detailed information about a specific contact by their ID. Returns full contact details including company info, addresses, VAT number, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('The unique ID of the contact to retrieve.')
    })
  )
  .output(
    z.object({
      contact: z.any().describe('The full contact object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let contact = await client.getContact(ctx.input.contactId);

    let name =
      contact.display_name || contact.company || `${contact.first_name} ${contact.last_name}`;
    return {
      output: { contact },
      message: `Retrieved contact: **${name}**`
    };
  })
  .build();
