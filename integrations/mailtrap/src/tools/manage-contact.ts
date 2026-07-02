import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailtrapClient } from '../lib/client';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, retrieve, update, or delete a contact in your Mailtrap account. Contacts can be assigned to lists and have custom fields (e.g., name, location, date of birth) for personalized campaigns.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete'])
        .describe('Action to perform on the contact'),
      contactIdentifier: z
        .string()
        .optional()
        .describe('Contact ID or email address. Required for get, update, and delete.'),
      email: z
        .string()
        .optional()
        .describe('Contact email address. Required for create and optional for update.'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom contact fields (e.g., { "first_name": "John", "city": "NYC" })'),
      listIds: z
        .array(z.number())
        .optional()
        .describe('List IDs to assign the contact to (for create)'),
      listIdsIncluded: z
        .array(z.number())
        .optional()
        .describe('List IDs to add the contact to (for update)'),
      listIdsExcluded: z
        .array(z.number())
        .optional()
        .describe('List IDs to remove the contact from (for update)'),
      unsubscribed: z.boolean().optional().describe('Set unsubscribe status (for update)')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('ID of the contact'),
      email: z.string().optional().describe('Email of the contact'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields of the contact'),
      action: z.string().describe('Action that was performed'),
      deleted: z.boolean().optional().describe('Whether the contact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailtrapClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let {
      action,
      contactIdentifier,
      email,
      fields,
      listIds,
      listIdsIncluded,
      listIdsExcluded,
      unsubscribed
    } = ctx.input;

    if (action === 'create') {
      if (!email) throw new Error('Email is required for creating a contact');
      let result = await client.createContact({ email, fields, listIds });
      return {
        output: {
          contactId: result.id?.toString(),
          email: result.email,
          fields: result.fields,
          action: 'created'
        },
        message: `Contact **${email}** created successfully.`
      };
    }

    if (action === 'get') {
      if (!contactIdentifier)
        throw new Error('contactIdentifier is required for getting a contact');
      let result = await client.getContact(contactIdentifier);
      return {
        output: {
          contactId: result.id?.toString(),
          email: result.email,
          fields: result.fields,
          action: 'retrieved'
        },
        message: `Retrieved contact **${result.email}** (ID: ${result.id}).`
      };
    }

    if (action === 'update') {
      if (!contactIdentifier)
        throw new Error('contactIdentifier is required for updating a contact');
      let result = await client.updateContact(contactIdentifier, {
        email,
        fields,
        listIdsIncluded,
        listIdsExcluded,
        unsubscribed
      });
      let contact = result.contact || result;
      return {
        output: {
          contactId: contact.id?.toString(),
          email: contact.email,
          fields: contact.fields,
          action: result.action || 'updated'
        },
        message: `Contact **${contact.email || contactIdentifier}** updated successfully.`
      };
    }

    if (action === 'delete') {
      if (!contactIdentifier)
        throw new Error('contactIdentifier is required for deleting a contact');
      await client.deleteContact(contactIdentifier);
      return {
        output: {
          action: 'deleted',
          deleted: true
        },
        message: `Contact **${contactIdentifier}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
