import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageAccounts = SlateTool.create(spec, {
  name: 'Manage Accounts',
  key: 'manage_accounts',
  description: `Create, update, or delete Account records in EspoCRM. Accounts represent organizations or companies that you do business with.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Operation to perform on the account'),
      accountId: z.string().optional().describe('Account ID (required for update and delete)'),
      name: z.string().optional().describe('Account name'),
      emailAddress: z.string().optional().describe('Primary email address'),
      phoneNumber: z.string().optional().describe('Primary phone number'),
      website: z.string().optional().describe('Website URL'),
      type: z.string().optional().describe('Account type (e.g., Customer, Partner, Investor)'),
      industry: z.string().optional().describe('Industry'),
      description: z.string().optional().describe('Description or notes'),
      assignedUserId: z.string().optional().describe('ID of the assigned user'),
      billingAddressStreet: z.string().optional().describe('Billing street address'),
      billingAddressCity: z.string().optional().describe('Billing city'),
      billingAddressState: z.string().optional().describe('Billing state or region'),
      billingAddressCountry: z.string().optional().describe('Billing country'),
      billingAddressPostalCode: z.string().optional().describe('Billing postal code'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('ID of the account'),
      name: z.string().optional().describe('Account name'),
      emailAddress: z.string().optional().describe('Primary email address'),
      phoneNumber: z.string().optional().describe('Primary phone number'),
      website: z.string().optional().describe('Website URL'),
      type: z.string().optional().describe('Account type'),
      industry: z.string().optional().describe('Industry'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, accountId, customFields, ...fields } = ctx.input;

    if (action === 'create') {
      let data: Record<string, any> = { ...fields, ...customFields };
      let result = await client.createRecord('Account', data);
      return {
        output: {
          accountId: result.id,
          name: result.name,
          emailAddress: result.emailAddress,
          phoneNumber: result.phoneNumber,
          website: result.website,
          type: result.type,
          industry: result.industry,
          createdAt: result.createdAt,
          modifiedAt: result.modifiedAt
        },
        message: `Account **${result.name || ''}** created successfully.`
      };
    }

    if (action === 'update') {
      if (!accountId) throw new Error('accountId is required for update');
      let data: Record<string, any> = { ...fields, ...customFields };
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) delete data[key];
      });
      let result = await client.updateRecord('Account', accountId, data);
      return {
        output: {
          accountId: result.id,
          name: result.name,
          emailAddress: result.emailAddress,
          phoneNumber: result.phoneNumber,
          website: result.website,
          type: result.type,
          industry: result.industry,
          createdAt: result.createdAt,
          modifiedAt: result.modifiedAt
        },
        message: `Account **${result.name || ''}** updated successfully.`
      };
    }

    if (action === 'delete') {
      if (!accountId) throw new Error('accountId is required for delete');
      await client.deleteRecord('Account', accountId);
      return {
        output: {
          accountId
        },
        message: `Account **${accountId}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
