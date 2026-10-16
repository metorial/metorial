import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { storeIdSchema } from '../lib/schemas';
import { requireFields } from '../lib/values';
import { spec } from '../spec';

export let manageWallet = SlateTool.create(spec, {
  name: 'Manage On-Chain Wallet',
  key: 'manage_wallet',
  description: `View on-chain wallet balance, list transactions, generate receive addresses, and create transactions for a store's wallet. Supports watch-only wallets and configured hot wallets.`,
  constraints: [
    'Sending transactions requires the wallet to be configured with a hot wallet or an external signing mechanism.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'balance',
          'transactions',
          'new_address',
          'send',
          'get_transaction',
          'fee_rate',
          'utxos'
        ])
        .describe('Action to perform on the wallet'),
      storeId: storeIdSchema,
      cryptoCode: z
        .string()
        .optional()
        .default('BTC')
        .describe('Cryptocurrency code (e.g., BTC, LTC)'),
      transactionId: z.string().optional().describe('Transaction ID for get_transaction'),
      blockTarget: z
        .number()
        .optional()
        .describe('Target confirmations in blocks for fee_rate'),
      // send params
      destination: z.string().optional().describe('Destination address (for send action)'),
      amount: z.string().optional().describe('Amount to send in BTC (for send action)'),
      feeRate: z.number().optional().describe('Fee rate in sat/vB (for send action)'),
      subtractFeeFromAmount: z
        .boolean()
        .optional()
        .describe('Subtract fee from the sent amount'),
      // transactions params
      take: z.number().optional().describe('Number of transactions to return'),
      skip: z.number().optional().describe('Number of transactions to skip')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      feeRate: z.record(z.string(), z.unknown()).optional().describe('Recommended fee rate'),
      utxos: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Unspent transaction outputs'),
      balance: z
        .object({
          confirmedBalance: z.string().optional().describe('Confirmed balance'),
          unconfirmedBalance: z.string().optional().describe('Unconfirmed balance')
        })
        .optional()
        .describe('Wallet balance'),
      transactions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Wallet transactions'),
      address: z.string().optional().describe('Generated receive address'),
      transaction: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Created transaction details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let { action, storeId, cryptoCode } = ctx.input;

    if (action === 'balance') {
      let wallet = await client.getWalletBalance(storeId, cryptoCode);
      return {
        output: {
          raw: wallet,
          balance: {
            confirmedBalance: wallet.confirmedBalance as string | undefined,
            unconfirmedBalance: wallet.unconfirmedBalance as string | undefined
          }
        },
        message: `Wallet balance: **${wallet.confirmedBalance ?? 'unknown'}** ${cryptoCode} confirmed, **${wallet.unconfirmedBalance ?? 'unknown'}** ${cryptoCode} unconfirmed.`
      };
    }

    if (action === 'transactions') {
      let txs = await client.getWalletTransactions(storeId, cryptoCode, {
        limit: ctx.input.take,
        skip: ctx.input.skip
      });
      return {
        output: { transactions: txs },
        message: `Found **${txs.length}** transaction(s).`
      };
    }

    if (action === 'new_address') {
      let addr = await client.createWalletAddress(storeId, cryptoCode);
      return {
        output: { address: addr.address as string, raw: addr },
        message: `Receive address: \`${addr.address}\`.`
      };
    }

    if (['get_transaction', 'fee_rate', 'utxos'].includes(action)) {
      if (action === 'get_transaction') requireFields(ctx.input, ['transactionId'], action);
      let data = await client.getWalletDetails(
        storeId,
        cryptoCode,
        action,
        ctx.input.transactionId,
        ctx.input.blockTarget
      );
      return {
        output: {
          raw: data,
          ...(action === 'utxos'
            ? { utxos: data as Record<string, unknown>[] }
            : action === 'fee_rate'
              ? { feeRate: data as Record<string, unknown> }
              : { transaction: data as Record<string, unknown> })
        },
        message: 'Retrieved wallet details.'
      };
    }
    requireFields(ctx.input, ['destination', 'amount'], action);
    // send
    let tx = await client.createWalletTransaction(storeId, cryptoCode!, {
      destination: ctx.input.destination!,
      amount: ctx.input.amount!,
      feeRate: ctx.input.feeRate,
      subtractFeeFromAmount: ctx.input.subtractFeeFromAmount
    });
    return {
      output: { transaction: tx },
      message: `Transaction created: sending **${ctx.input.amount}** ${cryptoCode} to \`${ctx.input.destination}\`.`
    };
  })
  .build();
