import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve Deep Image account details including available credits, username, email, webhook configuration, and billing address.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      username: z.string().describe('Account username'),
      email: z.string().describe('Account email address'),
      credits: z.number().describe('Available processing credits'),
      language: z.string().describe('Account language preference'),
      webhooks: z.record(z.string(), z.string()).describe('Configured webhook URLs'),
      billingAddress: z.record(z.string(), z.string()).describe('Billing address information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let account = await client.getAccountInfo();

    return {
      output: {
        username: account.username,
        email: account.email,
        credits: account.credits,
        language: account.language,
        webhooks: account.webhooks,
        billingAddress: account.billingAddress
      },
      message: `Account: **${account.username}** (${account.email}). Credits: **${account.credits}**.`
    };
  })
  .build();
