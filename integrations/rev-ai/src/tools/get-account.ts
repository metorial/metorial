import { SlateTool } from 'slates';
import { z } from 'zod';
import { RevAIClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieves account information including the email address and remaining balance in seconds for the authenticated Rev AI account.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().describe('Account email address'),
      balanceSeconds: z.number().describe('Remaining transcription balance in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RevAIClient({ token: ctx.auth.token });
    let account = await client.getAccount();

    let balanceMinutes = Math.floor(account.balanceSeconds / 60);
    let balanceHours = Math.floor(balanceMinutes / 60);
    let remainingMinutes = balanceMinutes % 60;

    return {
      output: account,
      message: `Account: **${account.email}** — Balance: **${balanceHours}h ${remainingMinutes}m** (${account.balanceSeconds}s)`
    };
  })
  .build();
