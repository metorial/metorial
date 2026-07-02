import { SlateTool } from 'slates';
import { z } from 'zod';
import { SkyfireClient } from '../lib/client';
import { spec } from '../spec';

export let getWalletBalance = SlateTool.create(spec, {
  name: 'Get Wallet Balance',
  key: 'get_wallet_balance',
  description: `Retrieve the current wallet balance for the authenticated agent, including available funds, held amounts, pending charges, and pending deposits.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      available: z.string().describe('Available balance in USD'),
      heldAmount: z.string().describe('Amount currently held (reserved for active tokens)'),
      pendingCharges: z.string().describe('Amount in pending charges'),
      pendingDeposits: z.string().describe('Amount in pending deposits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SkyfireClient({ token: ctx.auth.token });

    let balance = await client.getBalance();

    return {
      output: balance,
      message: `Wallet balance: **$${balance.available}** available, **$${balance.heldAmount}** held, **$${balance.pendingCharges}** pending charges, **$${balance.pendingDeposits}** pending deposits.`
    };
  })
  .build();
