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
      accountId: z.string().optional().describe('Account identifier, when returned'),
      email: z.string().optional().describe('Account email address, when returned'),
      name: z.string().optional().describe('Account holder name, when returned'),
      credits: z.number().describe('Remaining verification credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ListcleanClient({
      token: ctx.auth.token
    });

    ctx.progress('Fetching account profile...');
    let [profile, credits] = await Promise.all([
      client.getAccountProfile(),
      client.getCredits()
    ]);

    return {
      output: {
        accountId: profile.id !== undefined ? String(profile.id) : undefined,
        email: profile.email,
        name: profile.name,
        credits
      },
      message: `Account profile retrieved. **${credits}** verification credits remaining.`
    };
  })
  .build();
