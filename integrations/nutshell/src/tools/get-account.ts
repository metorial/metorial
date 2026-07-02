import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve an account (company) by ID from Nutshell CRM. Returns full account details including contacts, leads, URLs, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.number().describe('ID of the account to retrieve')
    })
  )
  .output(
    z.object({
      accountId: z.number().describe('ID of the account'),
      rev: z.string().describe('Revision identifier'),
      name: z.string().describe('Account name'),
      urls: z.array(z.any()).optional().describe('Website URLs'),
      phones: z.array(z.any()).optional().describe('Phone numbers'),
      address: z.any().optional().describe('Mailing address'),
      industry: z.any().optional().describe('Associated industry'),
      contacts: z.array(z.any()).optional().describe('Associated contacts'),
      leads: z.array(z.any()).optional().describe('Associated leads'),
      owner: z.any().optional().describe('Account owner'),
      description: z.string().optional().describe('Description'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      createdTime: z.string().optional().describe('Creation timestamp'),
      modifiedTime: z.string().optional().describe('Last modified timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.getAccount(ctx.input.accountId);

    return {
      output: {
        accountId: result.id,
        rev: String(result.rev),
        name: result.name,
        urls: result.url || result.urls,
        phones: result.phone || result.phones,
        address: result.address,
        industry: result.industry,
        contacts: result.contacts,
        leads: result.leads,
        owner: result.owner,
        description: result.description,
        customFields: result.customFields,
        createdTime: result.createdTime,
        modifiedTime: result.modifiedTime
      },
      message: `Retrieved account **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
