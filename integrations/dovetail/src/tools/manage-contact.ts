import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapContact } from '../lib/mappers';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create or update a research contact (participant/customer) in Dovetail. Contacts represent people involved in research activities.`,
  instructions: [
    'To create a contact, set action to "create" and provide both name and email.',
    'To update a contact, set action to "update", provide the contactId, and include fields to change.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update']).describe('The operation to perform'),
      contactId: z.string().optional().describe('Contact ID (required for update)'),
      name: z.string().optional().describe('Contact name'),
      email: z.string().optional().describe('Contact email')
    })
  )
  .output(
    z.object({
      contactId: z.string(),
      name: z.string(),
      email: z.string().optional(),
      createdAt: z.string(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.email)
        throw createApiServiceError('Both name and email are required to create a contact.');
      let body = pickDefined({ name: ctx.input.name, email: ctx.input.email });

      let contact = await client.createContact(body);
      return {
        output: mapContact(contact),
        message: `Created contact **${contact.name}** (ID: ${contact.id}).`
      };
    }

    if (!ctx.input.contactId) {
      throw createApiServiceError('contactId is required for update action');
    }

    if (ctx.input.name === undefined && ctx.input.email === undefined)
      throw createApiServiceError('Provide a name or email to update the contact.');
    let body = pickDefined({ name: ctx.input.name, email: ctx.input.email });

    let contact = await client.updateContact(ctx.input.contactId, body);
    return {
      output: mapContact(contact),
      message: `Updated contact **${contact.name}**.`
    };
  })
  .build();
