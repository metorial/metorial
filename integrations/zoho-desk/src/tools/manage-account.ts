import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageAccount = SlateTool.create(spec, {
  name: 'Manage Account',
  key: 'manage_account',
  description: `Create, update, or retrieve a company account. Accounts represent organizations/companies in Zoho Desk. Specify an existing accountId to update or retrieve, or omit it to create a new account.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z
        .string()
        .optional()
        .describe('Existing account ID to update or retrieve. Omit to create a new account.'),
      accountName: z.string().optional().describe('Name of the company account'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      website: z.string().optional().describe('Company website URL'),
      industry: z.string().optional().describe('Industry'),
      description: z.string().optional().describe('Description or notes about the account'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('ID of the account'),
      accountName: z.string().optional().describe('Account name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      website: z.string().optional().describe('Website URL'),
      industry: z.string().optional().describe('Industry'),
      createdTime: z.string().optional().describe('Creation time')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { accountId, customFields, ...fields } = ctx.input;

    let accountData: Record<string, any> = {};
    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) accountData[key] = value;
    }
    if (customFields) accountData.cf = customFields;

    let result: any;
    let action: string;

    if (accountId && Object.keys(accountData).length > 0) {
      result = await client.updateAccount(accountId, accountData);
      action = 'Updated';
    } else if (accountId) {
      result = await client.getAccount(accountId);
      action = 'Retrieved';
    } else {
      result = await client.createAccount(accountData);
      action = 'Created';
    }

    return {
      output: {
        accountId: result.id,
        accountName: result.accountName,
        email: result.email,
        phone: result.phone,
        website: result.website,
        industry: result.industry,
        createdTime: result.createdTime
      },
      message: `${action} account **${result.accountName || result.id}**`
    };
  })
  .build();
