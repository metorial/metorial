import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve account information and current balance. Useful for checking available funds before sending mail or booking campaigns.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string().optional().describe('Account ID'),
      email: z.string().optional().describe('Account email'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      balance: z.string().optional().describe('Current account balance')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let [info, balanceResult] = await Promise.all([
      client.getAccountInfo(),
      client.getAccountBalance()
    ]);

    return {
      output: {
        accountId: info?.id != null ? String(info.id) : undefined,
        email: info?.email ?? undefined,
        firstname: info?.firstname ?? undefined,
        lastname: info?.lastname ?? undefined,
        balance: balanceResult?.balance != null ? String(balanceResult.balance) : undefined
      },
      message: `Account: **${info?.email}** — Balance: **${balanceResult?.balance ?? 'unknown'}**`
    };
  })
  .build();
