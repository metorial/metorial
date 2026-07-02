import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, retrieve, update, or delete a contact. Contacts represent customers who communicate with your team. Use this to maintain your contact database programmatically.`
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID (required for get, update, delete)'),
      name: z.string().optional().describe('Contact name (for create or update)'),
      email: z.string().optional().describe('Contact email address (for create or update)'),
      phone: z.string().optional().describe('Contact phone number (for create or update)'),
      company: z.string().optional().describe('Contact company name (for create or update)')
    })
  )
  .output(
    z.object({
      contact: z
        .record(z.string(), z.any())
        .optional()
        .describe('Contact details (for get, create, update)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, contactId, name, email, phone, company } = ctx.input;

    if (action === 'get') {
      if (!contactId) throw new Error('contactId is required for get action');
      let contact = await client.getContact(contactId);
      return {
        output: { contact, success: true },
        message: `Retrieved contact **${contactId}**.`
      };
    }

    if (action === 'create') {
      let data: Record<string, any> = {};
      if (name) data.name = name;
      if (email) data.email = email;
      if (phone) data.phone = phone;
      if (company) data.company = company;
      let contact = await client.createContact(data);
      return {
        output: { contact, success: true },
        message: `Created contact **${name || email || phone}**.`
      };
    }

    if (action === 'update') {
      if (!contactId) throw new Error('contactId is required for update action');
      let data: Record<string, any> = {};
      if (name !== undefined) data.name = name;
      if (email !== undefined) data.email = email;
      if (phone !== undefined) data.phone = phone;
      if (company !== undefined) data.company = company;
      let contact = await client.updateContact(contactId, data);
      return {
        output: { contact, success: true },
        message: `Updated contact **${contactId}**.`
      };
    }

    if (action === 'delete') {
      if (!contactId) throw new Error('contactId is required for delete action');
      await client.deleteContact(contactId);
      return {
        output: { success: true },
        message: `Deleted contact **${contactId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
