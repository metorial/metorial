import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let createAccount = SlateTool.create(spec, {
  name: 'Create Account',
  key: 'create_account',
  description: `Create a new account (company) in Nutshell CRM. Accounts can be linked to contacts and leads. Supports URLs, phone numbers, addresses, industry, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Company/account name'),
      urls: z.array(z.string()).optional().describe('Website URLs for the account'),
      phones: z.array(z.string()).optional().describe('Phone numbers for the account'),
      address: z
        .object({
          address1: z.string().optional(),
          address2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
          country: z.string().optional()
        })
        .optional()
        .describe('Mailing address for the account'),
      industryId: z.number().optional().describe('Industry ID to associate with the account'),
      description: z.string().optional().describe('Description or notes about the account'),
      ownerUserId: z.number().optional().describe('ID of the user to set as account owner'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      accountId: z.number().describe('ID of the created account'),
      rev: z.string().describe('Revision identifier'),
      name: z.string().describe('Name of the created account'),
      entityType: z.string().describe('Entity type (Accounts)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let accountData: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.urls) accountData.url = ctx.input.urls;
    if (ctx.input.phones) accountData.phone = ctx.input.phones;
    if (ctx.input.address) accountData.address = ctx.input.address;
    if (ctx.input.industryId) accountData.industryId = ctx.input.industryId;
    if (ctx.input.description) accountData.description = ctx.input.description;
    if (ctx.input.ownerUserId)
      accountData.owner = { entityType: 'Users', id: ctx.input.ownerUserId };
    if (ctx.input.customFields) accountData.customFields = ctx.input.customFields;

    let result = await client.newAccount(accountData);

    return {
      output: {
        accountId: result.id,
        rev: String(result.rev),
        name: result.name,
        entityType: result.entityType
      },
      message: `Created account **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
