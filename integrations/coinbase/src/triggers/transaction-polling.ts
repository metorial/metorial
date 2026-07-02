import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CoinbaseClient } from '../lib/client';
import { spec } from '../spec';

export let transactionPolling = SlateTrigger.create(spec, {
  name: 'New Transactions',
  key: 'new_transactions',
  description:
    '[Polling fallback] Polls for new transactions (sends, receives, buys, sells, transfers) across Coinbase accounts. Detects new transactions since the last poll.'
})
  .input(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      transactionType: z
        .string()
        .describe('Transaction type (send, receive, buy, sell, etc.)'),
      accountId: z.string().describe('Account ID'),
      accountName: z.string().optional().describe('Account name'),
      status: z.string().describe('Transaction status'),
      amount: z.string().optional().describe('Transaction amount'),
      currency: z.string().optional().describe('Currency code'),
      nativeAmount: z.string().optional().describe('Amount in native currency'),
      nativeCurrency: z.string().optional().describe('Native currency code'),
      description: z.string().optional().nullable().describe('Transaction description'),
      createdAt: z.string().describe('Transaction creation time')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      transactionType: z.string().describe('Transaction type'),
      accountId: z.string().describe('Account ID'),
      accountName: z.string().optional().describe('Account name'),
      status: z.string().describe('Transaction status'),
      amount: z.string().optional().describe('Transaction amount'),
      currency: z.string().optional().describe('Currency code'),
      nativeAmount: z.string().optional().describe('Amount in native currency'),
      nativeCurrency: z.string().optional().describe('Native currency code'),
      description: z.string().optional().nullable().describe('Transaction description'),
      createdAt: z.string().describe('Transaction creation time')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new CoinbaseClient({ token: ctx.auth.token });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownIds = (ctx.state?.knownTransactionIds as string[]) || [];

      // Fetch accounts first
      let accountsResult = await client.listAccounts({ limit: 25 });
      let accounts = accountsResult.data || [];

      let allInputs: any[] = [];
      let newKnownIds: string[] = [];

      for (let account of accounts) {
        try {
          let txResult = await client.listTransactions(account.id, { limit: 10 });
          let transactions = txResult.data || [];

          for (let tx of transactions) {
            newKnownIds.push(tx.id);

            // Skip already known transactions
            if (knownIds.includes(tx.id)) continue;

            // On first poll, only include transactions from the last hour
            if (!lastPollTime) {
              let txTime = new Date(tx.created_at).getTime();
              let oneHourAgo = Date.now() - 60 * 60 * 1000;
              if (txTime < oneHourAgo) continue;
            }

            allInputs.push({
              transactionId: tx.id,
              transactionType: tx.type,
              accountId: account.id,
              accountName: account.name,
              status: tx.status,
              amount: tx.amount?.amount,
              currency: tx.amount?.currency,
              nativeAmount: tx.native_amount?.amount,
              nativeCurrency: tx.native_amount?.currency,
              description: tx.description || null,
              createdAt: tx.created_at
            });
          }
        } catch {
          // Skip accounts that fail (e.g., deleted accounts)
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownTransactionIds: newKnownIds.slice(0, 500) // Keep recent IDs for dedup
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `transaction.${ctx.input.transactionType}`,
        id: ctx.input.transactionId,
        output: {
          transactionId: ctx.input.transactionId,
          transactionType: ctx.input.transactionType,
          accountId: ctx.input.accountId,
          accountName: ctx.input.accountName,
          status: ctx.input.status,
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          nativeAmount: ctx.input.nativeAmount,
          nativeCurrency: ctx.input.nativeCurrency,
          description: ctx.input.description,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
