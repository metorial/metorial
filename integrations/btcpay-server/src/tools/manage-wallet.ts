import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { spec } from '../spec';

export let manageWallet = SlateTool.create(spec, {
  name: 'Manage On-Chain Wallet',
  key: 'manage_wallet',
  description: `View on-chain wallet balance, list transactions, generate receive addresses, and create transactions for a store's wallet. The wallet is non-custodial — private keys are never stored on the server.`,
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
        .enum(['balance', 'transactions', 'new_address', 'send'])
        .describe('Action to perform on the wallet'),
      storeId: z.string().describe('Store ID'),
      cryptoCode: z
        .string()
        .optional()
        .default('BTC')
        .describe('Cryptocurrency code (e.g., BTC, LTC)'),
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
          balance: {
            confirmedBalance: wallet.confirmedBalance as string | undefined,
            unconfirmedBalance: wallet.unconfirmedBalance as string | undefined
          }
        },
        message: `Wallet balance: **${wallet.confirmedBalance ?? '0'}** ${cryptoCode} confirmed, **${wallet.unconfirmedBalance ?? '0'}** ${cryptoCode} unconfirmed.`
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
        output: { address: addr.address as string },
        message: `Generated new receive address: \`${addr.address}\`.`
      };
    }

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
