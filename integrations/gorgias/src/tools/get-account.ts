import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve account-level information and settings for the Gorgias helpdesk, including domain, plan, and business configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.number().nullable().describe('Account ID'),
      domain: z.string().nullable().describe('Account domain'),
      name: z.string().nullable().describe('Company/account name'),
      timezone: z.string().nullable().describe('Account timezone'),
      language: z.string().nullable().describe('Default language'),
      plan: z.string().nullable().describe('Current subscription plan'),
      createdDatetime: z.string().nullable().describe('When the account was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let account = await client.getAccount();

    return {
      output: {
        accountId: account.id || null,
        domain: account.domain || null,
        name: account.name || null,
        timezone: account.timezone || null,
        language: account.language || null,
        plan: account.plan?.name || account.plan || null,
        createdDatetime: account.created_datetime || null
      },
      message: `Retrieved account info for **${account.name || account.domain || 'Unknown'}**.`
    };
  })
  .build();
