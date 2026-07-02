import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve your Kit account information including account name, plan type, primary email address, and timezone settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.number().describe('Kit account ID'),
      accountName: z.string().describe('Account display name'),
      planType: z.string().describe('Current subscription plan type'),
      primaryEmail: z.string().describe('Primary email address for the account'),
      createdAt: z.string().describe('Account creation timestamp'),
      userId: z.number().describe('User ID associated with the account'),
      userEmail: z.string().describe('User email address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getAccount();

    return {
      output: {
        accountId: data.account.id,
        accountName: data.account.name,
        planType: data.account.plan_type,
        primaryEmail: data.account.primary_email_address,
        createdAt: data.account.created_at,
        userId: data.user.id,
        userEmail: data.user.email
      },
      message: `Account **${data.account.name}** (${data.account.plan_type} plan) — ${data.account.primary_email_address}`
    };
  });
