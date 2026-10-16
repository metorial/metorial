import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import {
  optionalValue,
  readRecord,
  requireText,
  validateDestinations,
  validateOutput
} from '../lib/response';
import { spec } from '../spec';

let outputSchema = z.object({
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
  transactionUrls: z
    .array(z.string())
    .optional()
    .describe('All block explorer URLs when the provider returns multiple links'),
  createdAtUtc: z.number().optional().describe('Creation timestamp (UTC)'),
  raw: z.unknown().describe('Original provider response with credentials removed')
});

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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new PlisioClient({ token: ctx.auth.token });

    requireText(ctx.input.currency, 'Currency');
    let isMass = validateDestinations(ctx.input.addresses, ctx.input.amounts);
    let type: 'cash_out' | 'mass_cash_out' = isMass ? 'mass_cash_out' : 'cash_out';

    let result = readRecord(
      await client.withdraw({
        currency: ctx.input.currency,
        type,
        to: ctx.input.addresses,
        amount: ctx.input.amounts,
        feePlan: ctx.input.feePlan
      })
    );

    return {
      output: validateOutput(outputSchema, {
        operationId: result.id,
        type: result.type,
        status: result.status,
        currency: result.currency ?? result.psys_cid,
        amount: result.amount,
        fee: optionalValue(result.fee),
        walletHash: optionalValue(result.wallet_hash),
        sendMany: optionalValue(result.sendmany),
        txUrl: typeof result.tx_url === 'string' ? result.tx_url : undefined,
        transactionUrls: Array.isArray(result.tx_url) ? result.tx_url : undefined,
        createdAtUtc: optionalValue(result.created_at_utc),
        raw: result
      }),
      message: client.redact(
        `Withdrawal of **${result.amount} ${result.currency || result.psys_cid}** initiated (${type === 'mass_cash_out' ? 'mass withdrawal' : 'single withdrawal'}). Operation ID: \`${result.id}\`. Status: ${result.status}`
      )
    };
  })
  .build();
