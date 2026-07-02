import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, or delete a contact. Contacts represent messaging channel users (WhatsApp, Instagram, Telegram, Messenger). Supports profile details, stage management, and custom fields.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      contactId: z.string().optional().describe('Contact ID (required for update and delete)'),
      name: z.string().optional().describe('Contact name'),
      phoneNumber: z.string().optional().describe('Phone number (for WhatsApp contacts)'),
      countryCode: z.string().optional().describe('Country code (e.g., +1)'),
      channel: z
        .enum(['whatsapp', 'instagram', 'telegram', 'messenger'])
        .optional()
        .describe('Messaging channel'),
      username: z.string().optional().describe('Username (for Instagram/Telegram)'),
      stage: z.string().optional().describe('Sales funnel stage (e.g., Subscriber, Lead)'),
      notes: z.string().optional().describe('Internal notes'),
      locationId: z.string().optional().describe('Location ID'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('ID of the contact'),
      name: z.string().optional().describe('Contact name'),
      channel: z.string().optional().describe('Messaging channel'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    let { action, contactId, ...fields } = ctx.input;

    if (action === 'create') {
      let result = await client.createContact(fields);
      return {
        output: {
          contactId: result.id || result._id,
          name: result.name,
          channel: result.channel,
          success: true
        },
        message: `Created contact **${result.name || ''}** on ${result.channel || 'unknown channel'}.`
      };
    }

    if (action === 'update') {
      if (!contactId) throw new Error('contactId is required for update');
      let result = await client.updateContact(contactId, fields);
      return {
        output: {
          contactId: result.id || result._id || contactId,
          name: result.name,
          channel: result.channel,
          success: true
        },
        message: `Updated contact **${contactId}**.`
      };
    }

    if (action === 'delete') {
      if (!contactId) throw new Error('contactId is required for delete');
      await client.deleteContact(contactId);
      return {
        output: {
          contactId,
          success: true
        },
        message: `Deleted contact **${contactId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
