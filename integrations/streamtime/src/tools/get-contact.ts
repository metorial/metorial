import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a contact by its ID, including name, email, phone, position, and associated company information.`,
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
      contactId: z.number().describe('ID of the contact'),
      firstName: z.string().describe('Contact first name'),
      lastName: z.string().describe('Contact last name'),
      email: z.string().optional().describe('Contact email address'),
      raw: z.record(z.string(), z.any()).describe('Full contact object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let contact = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        raw: contact
      },
      message: `Retrieved contact **${contact.firstName} ${contact.lastName}** (ID: ${contact.id}).`
    };
  })
  .build();
