import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { formatTimestamp } from '../lib/output';
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
      fingerprint: z
        .string()
        .optional()
        .describe(
          'Stable contact fingerprint; required for ensure to identify the same contact on repeated calls'
        ),
      name: z.string().optional().describe('Contact name'),
      email: z.string().optional().describe('Contact email'),
      phone: z.string().optional().describe('Contact phone number'),
      cursor: z.string().optional().describe('Pagination cursor for nested list actions'),
      take: z
        .number()
        .refine(
          value => Number.isInteger(value) && value > 0,
          'take must be a positive whole number'
        )
        .optional()
        .describe('Page size for nested list actions'),
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
      cursor: z
        .string()
        .optional()
        .describe('Cursor for the next page of nested list results'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      runAsUserId: ctx.config.runAsUserId
    });

    let { action, contactId, fingerprint, name, email, phone, meta } = ctx.input;

    if (action === 'create') {
      let result = await client.createContact({ fingerprint, name, email, phone, meta });
      return {
        output: {
          contactId: result.id,
          name: result.name ?? name,
          email: result.email ?? email,
          phone: result.phone ?? phone,
          createdAt: formatTimestamp(result.createdAt)
        },
        message: `Contact **${result.name || result.id}** created.`
      };
    }

    if (action === 'ensure') {
      if (!fingerprint?.trim())
        throw createApiServiceError('fingerprint is required to ensure a contact.');
      let result = await client.ensureContact({ fingerprint, name, email, phone, meta });
      return {
        output: {
          contactId: result.id,
          name: result.name,
          email: result.email,
          phone: result.phone,
          createdAt: formatTimestamp(result.createdAt)
        },
        message: `Contact **${result.name || result.id}** ensured.`
      };
    }

    if (action === 'fetch') {
      if (!contactId) throw createApiServiceError('contactId is required for fetch');
      let result = await client.fetchContact(contactId);
      return {
        output: {
          contactId: result.id,
          name: result.name,
          email: result.email,
          phone: result.phone,
          createdAt: formatTimestamp(result.createdAt)
        },
        message: `Fetched contact **${result.name || result.id}**.`
      };
    }

    if (action === 'update') {
      if (!contactId) throw createApiServiceError('contactId is required for update');
      let updateData: Record<string, any> = {};
      if (fingerprint !== undefined) updateData.fingerprint = fingerprint;
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
      if (!contactId) throw createApiServiceError('contactId is required for delete');
      await client.deleteContact(contactId);
      return {
        output: { contactId },
        message: `Contact **${contactId}** deleted.`
      };
    }

    if (action === 'list_conversations') {
      if (!contactId)
        throw createApiServiceError('contactId is required for list_conversations');
      let result = await client.listContactConversations(contactId, {
        cursor: ctx.input.cursor,
        take: ctx.input.take
      });
      return {
        output: { contactId, conversations: result.items, cursor: result.cursor ?? undefined },
        message: `Found **${result.items.length}** conversations for contact **${contactId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
