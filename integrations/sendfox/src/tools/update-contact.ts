import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's name, list memberships, or custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to update'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      listIds: z.array(z.number()).optional().describe('List IDs to assign the contact to'),
      contactFields: z
        .array(
          z.object({
            name: z.string().describe('Custom field name'),
            value: z.string().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom contact fields to update')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the updated contact'),
      email: z.string().describe('Email address'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      updatedAt: z.string().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contact = await client.updateContact(ctx.input.contactId, {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      lists: ctx.input.listIds,
      contactFields: ctx.input.contactFields
    });

    return {
      output: {
        contactId: contact.id,
        email: contact.email,
        firstName: contact.first_name,
        lastName: contact.last_name,
        updatedAt: contact.updated_at
      },
      message: `Contact **${contact.email}** (ID: ${contact.id}) updated successfully.`
    };
  })
  .build();
