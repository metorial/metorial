import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create or update a research contact (participant/customer) in Dovetail. Contacts represent people involved in research activities.`,
  instructions: [
    'To create a contact, set action to "create" and provide name and optionally email.',
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
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let body: Record<string, unknown> = {};
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.email) body.email = ctx.input.email;

      let contact = await client.createContact(body);
      return {
        output: {
          contactId: contact.id,
          name: contact.name,
          email: contact.email,
          createdAt: contact.created_at,
          updatedAt: contact.updated_at
        },
        message: `Created contact **${contact.name}** (ID: ${contact.id}).`
      };
    }

    if (!ctx.input.contactId) {
      throw new Error('contactId is required for update action');
    }

    let body: Record<string, unknown> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.email) body.email = ctx.input.email;

    let contact = await client.updateContact(ctx.input.contactId, body);
    return {
      output: {
        contactId: contact.id,
        name: contact.name,
        email: contact.email,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      },
      message: `Updated contact **${contact.name}**.`
    };
  })
  .build();
