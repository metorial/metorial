import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve detailed information about a specific contact by its ID. Returns full contact data including account association, addresses, phone numbers, positions, social profiles, tags, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.any()).describe('Full contact details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let contact = await client.getContact(ctx.input.contactId);

    return {
      output: { contact },
      message: `Retrieved contact **${contact.name || contact.email || contact.id}**.`
    };
  })
  .build();
