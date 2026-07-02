import { SlateTool } from 'slates';
import { z } from 'zod';
import { PoofClient } from '../lib/client';
import { spec } from '../spec';

export let manageWallet = SlateTool.create(spec, {
  name: 'Manage Wallet',
  key: 'manage_wallet',
  description: `Create a blockchain wallet or check the balance of an existing wallet. Use action "create" to generate a new HD wallet for a specific blockchain network, or "balance" to fetch the current balance for a cryptocurrency.`,
  instructions: [
    'For wallet creation, use blockchain network names like "polygon", "ethereum", "bitcoin".',
    'For balance checks, use crypto ticker symbols like "BTC", "LTC", "DOGE".',
    'The payouts endpoint is disabled for users with external wallets.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'balance'])
        .describe('Action to perform: "create" a new wallet or check "balance"'),
      currency: z
        .string()
        .describe(
          'For create: blockchain network (e.g., "polygon", "ethereum"). For balance: crypto ticker (e.g., "BTC", "LTC")'
        )
    })
  )
  .output(
    z.object({
      balance: z.string().optional().describe('Wallet balance (when checking balance)'),
      crypto: z.string().optional().describe('Cryptocurrency ticker'),
      raw: z.any().optional().describe('Full response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PoofClient({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let result = await client.createWallet({ currency: ctx.input.currency });
      return {
        output: {
          crypto: ctx.input.currency,
          raw: result
        },
        message: `Wallet created for **${ctx.input.currency}**.`
      };
    } else {
      let result = await client.getBalance({ crypto: ctx.input.currency });
      let balance = result?.balance?.toString() || '0';
      return {
        output: {
          balance,
          crypto: result?.crypto || ctx.input.currency,
          raw: result
        },
        message: `Balance for **${ctx.input.currency}**: ${balance}`
      };
    }
  })
  .build();
