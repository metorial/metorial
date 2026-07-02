import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, retrieve, update, or delete a contact in Synthflow. Contacts are used for phonebook management and call targeting. Use the **operation** field to choose the action.`
})
  .input(
    z.object({
      operation: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Operation to perform'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID (required for get, update, delete)'),
      name: z.string().optional().describe('Contact name (used in create/update)'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Contact phone number in E.164 format (used in create/update)'),
      email: z.string().optional().describe('Contact email (used in create/update)'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional metadata for the contact (used in create/update)'),
      limit: z.number().optional().describe('Pagination limit (used in list)'),
      offset: z.number().optional().describe('Pagination offset (used in list)')
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.any()).optional().describe('Contact details'),
      contacts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of contacts (for list operation)'),
      contactId: z.string().optional().describe('Created contact ID'),
      deleted: z.boolean().optional().describe('Whether the contact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { operation, contactId, name, phoneNumber, email, metadata } = ctx.input;

    if (operation === 'create') {
      let body: Record<string, any> = {};
      if (name) body.name = name;
      if (phoneNumber) body.phone_number = phoneNumber;
      if (email) body.email = email;
      if (metadata) body.contact_metadata = metadata;
      let result = await client.createContact(body);
      return {
        output: { contactId: result.response?.id },
        message: `Created contact **${name || 'Unknown'}**.`
      };
    }

    if (operation === 'get') {
      if (!contactId) throw new Error('contactId is required for get operation');
      let result = await client.getContact(contactId);
      return {
        output: { contact: result.response || result },
        message: `Retrieved contact \`${contactId}\`.`
      };
    }

    if (operation === 'update') {
      if (!contactId) throw new Error('contactId is required for update operation');
      let body: Record<string, any> = {};
      if (name) body.name = name;
      if (phoneNumber) body.phone_number = phoneNumber;
      if (email) body.email = email;
      if (metadata) body.contact_metadata = metadata;
      let result = await client.updateContact(contactId, body);
      return {
        output: { contact: result.response || result },
        message: `Updated contact \`${contactId}\`.`
      };
    }

    if (operation === 'delete') {
      if (!contactId) throw new Error('contactId is required for delete operation');
      await client.deleteContact(contactId);
      return {
        output: { deleted: true },
        message: `Deleted contact \`${contactId}\`.`
      };
    }

    if (operation === 'list') {
      let result = await client.listContacts({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let contacts = result.response?.contacts || result.response || [];
      return {
        output: { contacts: Array.isArray(contacts) ? contacts : [] },
        message: `Found ${Array.isArray(contacts) ? contacts.length : 0} contact(s).`
      };
    }

    throw new Error(`Unknown operation: ${operation}`);
  })
  .build();
