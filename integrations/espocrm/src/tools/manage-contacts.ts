import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageContacts = SlateTool.create(spec, {
  name: 'Manage Contacts',
  key: 'manage_contacts',
  description: `Create, update, or delete Contact records in EspoCRM. Contacts represent individual people and can be linked to Accounts and other entities.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Operation to perform on the contact'),
      contactId: z.string().optional().describe('Contact ID (required for update and delete)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      emailAddress: z.string().optional().describe('Primary email address'),
      phoneNumber: z.string().optional().describe('Primary phone number'),
      accountId: z.string().optional().describe('ID of the associated Account'),
      title: z.string().optional().describe('Job title'),
      description: z.string().optional().describe('Description or notes'),
      assignedUserId: z.string().optional().describe('ID of the assigned user'),
      addressStreet: z.string().optional().describe('Street address'),
      addressCity: z.string().optional().describe('City'),
      addressState: z.string().optional().describe('State or region'),
      addressCountry: z.string().optional().describe('Country'),
      addressPostalCode: z.string().optional().describe('Postal code'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      emailAddress: z.string().optional().describe('Primary email address'),
      phoneNumber: z.string().optional().describe('Primary phone number'),
      accountId: z.string().optional().describe('Associated Account ID'),
      accountName: z.string().optional().describe('Associated Account name'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, contactId, customFields, ...fields } = ctx.input;

    if (action === 'create') {
      let data: Record<string, any> = { ...fields, ...customFields };
      let result = await client.createRecord('Contact', data);
      return {
        output: {
          contactId: result.id,
          firstName: result.firstName,
          lastName: result.lastName,
          emailAddress: result.emailAddress,
          phoneNumber: result.phoneNumber,
          accountId: result.accountId,
          accountName: result.accountName,
          createdAt: result.createdAt,
          modifiedAt: result.modifiedAt
        },
        message: `Contact **${result.firstName || ''} ${result.lastName || ''}** created successfully.`
      };
    }

    if (action === 'update') {
      if (!contactId) throw new Error('contactId is required for update');
      let data: Record<string, any> = { ...fields, ...customFields };
      // Remove undefined values
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) delete data[key];
      });
      let result = await client.updateRecord('Contact', contactId, data);
      return {
        output: {
          contactId: result.id,
          firstName: result.firstName,
          lastName: result.lastName,
          emailAddress: result.emailAddress,
          phoneNumber: result.phoneNumber,
          accountId: result.accountId,
          accountName: result.accountName,
          createdAt: result.createdAt,
          modifiedAt: result.modifiedAt
        },
        message: `Contact **${result.firstName || ''} ${result.lastName || ''}** updated successfully.`
      };
    }

    if (action === 'delete') {
      if (!contactId) throw new Error('contactId is required for delete');
      await client.deleteRecord('Contact', contactId);
      return {
        output: {
          contactId
        },
        message: `Contact **${contactId}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
