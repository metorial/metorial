import { createApiServiceError, pickDefined, SlateTool } from 'slates';
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
      search: z.string().optional().describe('Search contacts by phone number (list)'),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Limit the contacts returned from the provider page (list)'),
      offset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Legacy field; current API does not support nonzero offsets')
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
      deleted: z.boolean().optional().describe('Whether the contact was deleted'),
      total: z.number().optional().describe('Provider total number of matching contacts'),
      pageSize: z.number().optional(),
      pageNumber: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { operation, contactId, name, phoneNumber, email, metadata } = ctx.input;

    if (operation === 'create') {
      if (!name?.trim() || !phoneNumber?.trim())
        throw createApiServiceError('name and phoneNumber are required to create a contact.');
      let body: Record<string, any> = {};
      if (name) body.name = name;
      if (phoneNumber) body.phone_number = phoneNumber;
      if (email) body.email = email;
      if (metadata) body.contact_metadata = metadata;
      let result = await client.createContact(body);
      if (!result.response?.id)
        throw createApiServiceError('Synthflow did not return the created contact ID.');
      return {
        output: { contactId: result.response?.id },
        message: `Created contact **${name || 'Unknown'}**.`
      };
    }

    if (operation === 'get') {
      if (!contactId) throw createApiServiceError('contactId is required for get operation');
      let result = await client.getContact(contactId);
      if (result.response?.id !== contactId)
        throw createApiServiceError('Synthflow did not return the requested contact.');
      return {
        output: { contact: result.response, contactId },
        message: `Retrieved contact \`${contactId}\`.`
      };
    }

    if (operation === 'update') {
      if (!contactId)
        throw createApiServiceError('contactId is required for update operation');
      let body = pickDefined({
        name,
        phone_number: phoneNumber,
        email,
        contact_metadata: metadata
      });
      if (!Object.keys(body).length)
        throw createApiServiceError('Provide at least one contact field to update.');
      await client.updateContact(contactId, body);
      let result = await client.getContact(contactId);
      if (result.response?.id !== contactId)
        throw createApiServiceError('Synthflow did not return the updated contact.');
      return {
        output: { contact: result.response, contactId },
        message: `Updated contact \`${contactId}\`.`
      };
    }

    if (operation === 'delete') {
      if (!contactId)
        throw createApiServiceError('contactId is required for delete operation');
      await client.deleteContact(contactId);
      return {
        output: { deleted: true },
        message: `Deleted contact \`${contactId}\`.`
      };
    }

    if (operation === 'list') {
      if (ctx.input.offset)
        throw createApiServiceError(
          'The current contacts API does not support offset pagination. Use search to find a phone number.'
        );
      let result = await client.listContacts({ search: ctx.input.search });
      let response = result.response || {};
      let contacts = response.items || [];
      if (ctx.input.limit !== undefined) contacts = contacts.slice(0, ctx.input.limit);
      return {
        output: {
          contacts: Array.isArray(contacts) ? contacts : [],
          total: response.total,
          pageSize: response.page_size,
          pageNumber: response.page_number
        },
        message: `Found ${Array.isArray(contacts) ? contacts.length : 0} contact(s).`
      };
    }

    throw createApiServiceError(`Unknown operation: ${operation}`);
  })
  .build();
