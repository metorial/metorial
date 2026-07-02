import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepSeekClient } from '../lib/client';
import { spec } from '../spec';

export let getBalance = SlateTool.create(spec, {
  name: 'Get Balance',
  key: 'get_balance',
  description: `Retrieve the current DeepSeek account balance and availability status. Returns balance details broken down by currency, including granted and topped-up amounts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      isAvailable: z
        .boolean()
        .describe('Whether the account balance is sufficient for API calls'),
      balances: z
        .array(
          z.object({
            currency: z.string().describe('Currency code (CNY or USD)'),
            totalBalance: z.string().describe('Total available balance'),
            grantedBalance: z.string().describe('Total unexpired granted balance'),
            toppedUpBalance: z.string().describe('Total topped-up balance')
          })
        )
        .describe('Balance information per currency')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepSeekClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getBalance();

    let balances = result.balance_infos.map(b => ({
      currency: b.currency,
      totalBalance: b.total_balance,
      grantedBalance: b.granted_balance,
      toppedUpBalance: b.topped_up_balance
    }));

    let balanceSummary = balances.map(b => `${b.currency}: ${b.totalBalance}`).join(', ');

    return {
      output: {
        isAvailable: result.is_available,
        balances
      },
      message: `**Account status:** ${result.is_available ? 'Available' : 'Insufficient balance'}\n**Balances:** ${balanceSummary}`
    };
  })
  .build();
