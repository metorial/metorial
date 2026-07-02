import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContactTool = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, delete, fetch, or ensure contacts. Contacts represent end-users interacting with your chatbots. The "ensure" action creates a contact if it doesn't exist or retrieves it if it does. Also supports listing a contact's conversations.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'fetch', 'ensure', 'list_conversations'])
        .describe('Action to perform'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID (required for update, delete, fetch, list_conversations)'),
      name: z.string().optional().describe('Contact name'),
      email: z.string().optional().describe('Contact email'),
      phone: z.string().optional().describe('Contact phone number'),
      meta: z.record(z.string(), z.any()).optional().describe('Arbitrary metadata')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('Contact ID'),
      name: z.string().optional().describe('Contact name'),
      email: z.string().optional().describe('Contact email'),
      phone: z.string().optional().describe('Contact phone'),
      conversations: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Contact conversations'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      runAsUserId: ctx.config.runAsUserId
    });

    let { action, contactId, name, email, phone, meta } = ctx.input;

    if (action === 'create') {
      let result = await client.createContact({ name, email, phone, meta });
      return {
        output: {
          contactId: result.id,
          name: result.name,
          email: result.email,
          phone: result.phone,
          createdAt: result.createdAt
        },
        message: `Contact **${result.name || result.id}** created.`
      };
    }

    if (action === 'ensure') {
      let result = await client.ensureContact({ name, email, phone, meta });
      return {
        output: {
          contactId: result.id,
          name: result.name,
          email: result.email,
          phone: result.phone,
          createdAt: result.createdAt
        },
        message: `Contact **${result.name || result.id}** ensured.`
      };
    }

    if (action === 'fetch') {
      if (!contactId) throw new Error('contactId is required for fetch');
      let result = await client.fetchContact(contactId);
      return {
        output: {
          contactId: result.id,
          name: result.name,
          email: result.email,
          phone: result.phone,
          createdAt: result.createdAt
        },
        message: `Fetched contact **${result.name || result.id}**.`
      };
    }

    if (action === 'update') {
      if (!contactId) throw new Error('contactId is required for update');
      let updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (meta !== undefined) updateData.meta = meta;
      await client.updateContact(contactId, updateData);
      return {
        output: { contactId, name, email, phone },
        message: `Contact **${contactId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!contactId) throw new Error('contactId is required for delete');
      await client.deleteContact(contactId);
      return {
        output: { contactId },
        message: `Contact **${contactId}** deleted.`
      };
    }

    if (action === 'list_conversations') {
      if (!contactId) throw new Error('contactId is required for list_conversations');
      let result = await client.listContactConversations(contactId);
      return {
        output: { contactId, conversations: result.items },
        message: `Found **${result.items.length}** conversations for contact **${contactId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
