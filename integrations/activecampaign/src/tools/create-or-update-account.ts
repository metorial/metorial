import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateAccount = SlateTool.create(spec, {
  name: 'Create or Update Account',
  key: 'create_or_update_account',
  description: `Creates a new company/organization account or updates an existing one. Accounts can be associated with contacts and deals. Supports custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z
        .string()
        .optional()
        .describe('ID of the account to update (omit to create a new account)'),
      name: z
        .string()
        .optional()
        .describe('Name of the company/organization (required for create)'),
      accountUrl: z.string().optional().describe('Website URL of the account'),
      customFields: z
        .array(
          z.object({
            customFieldId: z.number().describe('ID of the custom field'),
            fieldValue: z.string().describe('Value for the custom field')
          })
        )
        .optional()
        .describe('Custom field values')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('ID of the account'),
      name: z.string().describe('Name of the account'),
      accountUrl: z.string().optional().describe('Website URL'),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let accountInput = {
      name: ctx.input.name || '',
      accountUrl: ctx.input.accountUrl,
      fields: ctx.input.customFields
    };

    let result: any;
    if (ctx.input.accountId) {
      result = await client.updateAccount(ctx.input.accountId, accountInput);
    } else {
      if (!ctx.input.name) throw new Error('name is required for creating an account');
      result = await client.createAccount(accountInput);
    }

    let account = result.account;

    return {
      output: {
        accountId: account.id,
        name: account.name,
        accountUrl: account.accountUrl || undefined,
        createdAt: account.createdTimestamp || account.cdate || undefined,
        updatedAt: account.updatedTimestamp || account.udate || undefined
      },
      message: ctx.input.accountId
        ? `Account **${account.name}** (ID: ${account.id}) updated.`
        : `Account **${account.name}** (ID: ${account.id}) created.`
    };
  })
  .build();
