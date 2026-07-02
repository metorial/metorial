import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update a contact's attributes such as name, phone, birthdate, or any custom attributes. System-managed values like credit balance and creation date cannot be updated through this tool.`,
  constraints: ['System values (credit balance, creation date) cannot be updated.']
})
  .input(
    z.object({
      contactUuid: z.string().describe('UUID of the contact to update'),
      attributes: z
        .record(z.string(), z.any())
        .describe(
          'Key-value pairs of attributes to update (e.g. { "first_name": "John", "last_name": "Doe", "phone": "+31612345678" })'
        )
    })
  )
  .output(
    z.object({
      contactUuid: z.string().describe('UUID of the updated contact'),
      email: z.string().optional().describe('Email address'),
      updatedAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated attribute values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateContact(ctx.input.contactUuid, ctx.input.attributes);
    let contact = result.data || result;

    return {
      output: {
        contactUuid: contact.uuid || ctx.input.contactUuid,
        email: contact.email,
        updatedAttributes: ctx.input.attributes
      },
      message: `Updated contact **${contact.email || ctx.input.contactUuid}** with ${Object.keys(ctx.input.attributes).length} attribute(s).`
    };
  })
  .build();
