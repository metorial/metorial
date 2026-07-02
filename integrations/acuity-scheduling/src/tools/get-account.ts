import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account',
  description: `Retrieve information about the authenticated Acuity Scheduling account, including the account owner name, email, and timezone.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.number().describe('Account ID'),
      name: z.string().describe('Account owner name'),
      email: z.string().describe('Account email'),
      timezone: z.string().optional().describe('Account timezone'),
      schedulingPage: z.string().optional().describe('Public scheduling page URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let me = await client.getMe();

    return {
      output: {
        accountId: me.id,
        name: me.name || '',
        email: me.email || '',
        timezone: me.timezone || undefined,
        schedulingPage: me.schedulingPage || undefined
      },
      message: `Account: **${me.name}** (${me.email}).`
    };
  })
  .build();
