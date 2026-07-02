import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's details. You can modify name, email, or company association. Only provided fields will be updated.`
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
      name: z.string().optional().describe('New contact name'),
      email: z.string().optional().describe('New email address'),
      companyId: z.string().optional().describe('Link to a company by ID'),
      companyName: z.string().optional().describe('Link to a company by name'),
      companyExternalId: z.string().optional().describe('Link to a company by external ID')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the updated contact'),
      email: z.string().describe('Contact email address'),
      name: z.string().nullable().describe('Contact name'),
      updatedAt: z.string().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let { contactId, ...updateData } = ctx.input;
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateContact(contactId, updateData);

    return {
      output: {
        contactId: result.id,
        email: result.email,
        name: result.name ?? null,
        updatedAt: result.updatedAt
      },
      message: `Updated contact **${result.name || result.email}** (${result.id}).`
    };
  })
  .build();
