import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a Drift contact by their ID or email address. Returns contact attributes including name, email, phone, and any custom attributes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().optional().describe('Drift contact ID to look up'),
      email: z.string().optional().describe('Email address to search for contacts')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.number().describe('Drift contact ID'),
            createdAt: z.number().optional().describe('Unix timestamp of contact creation'),
            attributes: z
              .record(z.string(), z.any())
              .optional()
              .describe('Contact attributes including email, name, phone, and custom fields')
          })
        )
        .describe('List of matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);

    let contacts: any[] = [];

    if (ctx.input.contactId) {
      let contact = await client.getContact(ctx.input.contactId);
      if (contact) contacts.push(contact);
    } else if (ctx.input.email) {
      contacts = await client.getContactsByEmail(ctx.input.email);
    } else {
      throw new Error('Either contactId or email must be provided');
    }

    return {
      output: {
        contacts: contacts.map((c: any) => ({
          contactId: c.id,
          createdAt: c.createdAt,
          attributes: c.attributes
        }))
      },
      message:
        contacts.length > 0 ? `Found **${contacts.length}** contact(s).` : `No contacts found.`
    };
  })
  .build();
