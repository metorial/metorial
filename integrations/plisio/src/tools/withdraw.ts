import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { spec } from '../spec';

export let withdraw = SlateTool.create(spec, {
  name: 'Withdraw',
  key: 'withdraw',
  description: `Send cryptocurrency from your Plisio balance to one or more external wallet addresses. Supports single and mass (bulk) withdrawals. For mass withdrawals, provide comma-separated addresses and amounts.`,
  instructions: [
    'For mass withdrawals, provide multiple addresses and amounts as comma-separated strings. Each amount corresponds to the address at the same position.',
    'Request IP must be configured in shop API settings for withdrawals to work.'
  ],
  constraints: [
    'API withdrawal must be enabled in your Plisio shop settings.',
    'Request IP must be whitelisted in API settings.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      currency: z.string().describe('Cryptocurrency ID (e.g. BTC, ETH, LTC)'),
      addresses: z
        .string()
        .describe(
          'Destination wallet address, or comma-separated addresses for mass withdrawal'
        ),
      amounts: z
        .string()
        .describe(
          'Amount to send, or comma-separated amounts matching each address for mass withdrawal'
        ),
      feePlan: z
        .enum(['normal', 'priority'])
        .optional()
        .describe('Fee plan to use for the transaction')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('Plisio operation ID for the withdrawal'),
      type: z.string().describe('Withdrawal type: cash_out or mass_cash_out'),
      status: z.string().describe('Current withdrawal status'),
      currency: z.string().describe('Cryptocurrency code'),
      amount: z.string().describe('Total amount withdrawn'),
      fee: z.string().optional().describe('Network transaction fee'),
      walletHash: z.string().optional().describe('Destination address (single withdrawal)'),
      sendMany: z
        .record(z.string(), z.string())
        .optional()
        .describe('Address-to-amount mapping (mass withdrawal)'),
      txUrl: z.string().optional().describe('Block explorer URL for the transaction'),
      createdAtUtc: z.number().optional().describe('Creation timestamp (UTC)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlisioClient({ token: ctx.auth.token });

    let isMass = ctx.input.addresses.includes(',');
    let type: 'cash_out' | 'mass_cash_out' = isMass ? 'mass_cash_out' : 'cash_out';

    let result = await client.withdraw({
      currency: ctx.input.currency,
      type,
      to: ctx.input.addresses,
      amount: ctx.input.amounts,
      feePlan: ctx.input.feePlan
    });

    return {
      output: {
        operationId: result.id,
        type: result.type,
        status: result.status,
        currency: result.currency ?? result.psys_cid,
        amount: result.amount,
        fee: result.fee,
        walletHash: result.wallet_hash,
        sendMany: result.sendmany,
        txUrl: result.tx_url,
        createdAtUtc: result.created_at_utc
      },
      message: `Withdrawal of **${result.amount} ${result.currency || result.psys_cid}** initiated (${type === 'mass_cash_out' ? 'mass withdrawal' : 'single withdrawal'}). Operation ID: \`${result.id}\`. Status: ${result.status}`
    };
  })
  .build();
