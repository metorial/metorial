import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let accountFields = z
  .object({
    name: z.string().optional().describe('Company name'),
    vatNumber: z.string().optional().describe('VAT number'),
    phone: z.string().optional().describe('Primary phone number'),
    phone2: z.string().optional().describe('Secondary phone number'),
    phone3: z.string().optional().describe('Tertiary phone number'),
    email: z.string().optional().describe('Email address'),
    website: z.string().optional().describe('Website URL'),
    fax: z.string().optional().describe('Fax number'),
    address1: z.string().optional().describe('Primary address line'),
    address2: z.string().optional().describe('Secondary address line'),
    city: z.string().optional().describe('City'),
    postcode: z.string().optional().describe('Postal code'),
    region: z.string().optional().describe('Region or state'),
    countryId: z.number().optional().describe('Country ID'),
    statusId: z.number().optional().describe('Account status ID'),
    typeId: z.number().optional().describe('Account type ID'),
    segmentId: z.number().optional().describe('Segment ID'),
    branchId: z.number().optional().describe('Branch ID'),
    salesRepId1: z.number().optional().describe('Primary sales rep ID'),
    salesRepId2: z.number().optional().describe('Secondary sales rep ID'),
    salesRepId3: z.number().optional().describe('Tertiary sales rep ID'),
    salesRepId4: z.number().optional().describe('Fourth sales rep ID'),
    salesRepId5: z.number().optional().describe('Fifth sales rep ID'),
    comment: z.string().optional().describe('Comments or notes'),
    latitude: z.number().optional().describe('Latitude for geolocation'),
    longitude: z.number().optional().describe('Longitude for geolocation'),
    rateId: z.number().optional().describe('Rate/price list ID'),
    extId: z.string().optional().describe('External system ID for synchronization')
  })
  .describe('Account fields to set');

export let manageAccount = SlateTool.create(spec, {
  name: 'Manage Account',
  key: 'manage_account',
  description: `Create, update, or delete account (company) records in ForceManager.
Accounts represent companies or organizations and can have multiple sales representatives assigned.
Use **action** to specify the operation. For updates, only fields provided will be modified.`,
  instructions: [
    'Use the "list of values" tool to look up valid statusId, typeId, segmentId, branchId, and countryId values.',
    'When updating, omit fields you do not want to change. Sending an empty string clears the field.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      accountId: z.number().optional().describe('Account ID (required for update and delete)'),
      fields: accountFields
        .optional()
        .describe('Account fields (required for create, optional for update)')
    })
  )
  .output(
    z.object({
      accountId: z.number().optional().describe('ID of the affected account'),
      message: z.string().optional().describe('Status message from the API'),
      account: z.any().optional().describe('Full account record (returned on create/update)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.action === 'create') {
      if (!ctx.input.fields) {
        throw new Error('Fields are required for creating an account');
      }
      let result = await client.createCompany(ctx.input.fields);
      let accountId = result?.id;
      let account = accountId ? await client.getCompany(accountId) : result;
      return {
        output: { accountId, message: 'Account created successfully', account },
        message: `Created account **${ctx.input.fields.name || accountId}** (ID: ${accountId})`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.accountId) {
        throw new Error('accountId is required for updating an account');
      }
      await client.updateCompany(ctx.input.accountId, ctx.input.fields || {});
      let account = await client.getCompany(ctx.input.accountId);
      return {
        output: {
          accountId: ctx.input.accountId,
          message: 'Account updated successfully',
          account
        },
        message: `Updated account ID **${ctx.input.accountId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.accountId) {
        throw new Error('accountId is required for deleting an account');
      }
      await client.deleteCompany(ctx.input.accountId);
      return {
        output: { accountId: ctx.input.accountId, message: 'Account deleted successfully' },
        message: `Deleted account ID **${ctx.input.accountId}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
