import { SlateTool } from 'slates';
import { z } from 'zod';
import { ListcleanClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve your Listclean account profile and remaining credit balance. Credits operate on a pay-as-you-go model and never expire.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string().describe('Unique account identifier'),
      email: z.string().describe('Account email address'),
      name: z.string().describe('Account holder name'),
      credits: z.number().describe('Remaining verification credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ListcleanClient({
      token: ctx.auth.token
    });

    ctx.progress('Fetching account profile...');
    let profile = await client.getAccountProfile();

    return {
      output: {
        accountId: profile.id ? String(profile.id) : '',
        email: profile.email || '',
        name: profile.name || '',
        credits: profile.credits ?? 0
      },
      message: `Account: **${profile.name || profile.email}** — **${profile.credits ?? 0}** credits remaining.`
    };
  })
  .build();
