import { SlateTool } from 'slates';
import { z } from 'zod';
import { coinbaseOAuthAuthMethods } from '../lib/auth-methods';
import { CoinbaseClient } from '../lib/client';
import { coinbaseServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageAccounts = SlateTool.create(spec, {
  name: 'Manage Accounts',
  key: 'manage_accounts',
  description: `List, get, create, update, or delete Coinbase cryptocurrency wallets. Each account represents a different currency wallet with its balance. Use **action** to specify the operation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .authMethods(coinbaseOAuthAuthMethods)
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      accountId: z
        .string()
        .optional()
        .describe('Account ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Account name (required for create, optional for update)'),
      limit: z.number().optional().describe('Max results to return (for list, default 25)'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination — account ID to start after')
    })
  )
  .output(
    z.object({
      accountId: z.string().optional().describe('Account ID'),
      accountName: z.string().optional().describe('Account name'),
      currency: z.string().optional().describe('Currency code (e.g., BTC, ETH)'),
      balanceAmount: z.string().optional().describe('Balance amount'),
      balanceCurrency: z.string().optional().describe('Balance currency'),
      nativeBalanceAmount: z.string().optional().describe('Balance in native currency'),
      nativeBalanceCurrency: z.string().optional().describe('Native currency code'),
      accountType: z.string().optional().describe('Account type (wallet, vault, fiat)'),
      deleted: z.boolean().optional().describe('Whether the account was deleted'),
      accounts: z
        .array(
          z.object({
            accountId: z.string(),
            accountName: z.string().optional(),
            currency: z.string().optional(),
            balanceAmount: z.string().optional(),
            balanceCurrency: z.string().optional(),
            accountType: z.string().optional()
          })
        )
        .optional()
        .describe('List of accounts (for list action)'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinbaseClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name) {
        throw coinbaseServiceError('name is required for create action');
      }
      let account = await client.createAccount(ctx.input.name);
      return {
        output: {
          accountId: account.id,
          accountName: account.name,
          currency: account.currency?.code,
          balanceAmount: account.balance?.amount,
          balanceCurrency: account.balance?.currency,
          nativeBalanceAmount: account.native_balance?.amount,
          nativeBalanceCurrency: account.native_balance?.currency,
          accountType: account.type
        },
        message: `Created account **${account.name}** (${account.currency?.code || 'N/A'})`
      };
    }

    if (action === 'get') {
      if (!ctx.input.accountId) {
        throw coinbaseServiceError('accountId is required for get action');
      }
      let account = await client.getAccount(ctx.input.accountId);
      return {
        output: {
          accountId: account.id,
          accountName: account.name,
          currency: account.currency?.code,
          balanceAmount: account.balance?.amount,
          balanceCurrency: account.balance?.currency,
          nativeBalanceAmount: account.native_balance?.amount,
          nativeBalanceCurrency: account.native_balance?.currency,
          accountType: account.type
        },
        message: `Retrieved account **${account.name}** — Balance: ${account.balance?.amount} ${account.balance?.currency}`
      };
    }

    if (action === 'update') {
      if (!ctx.input.accountId) {
        throw coinbaseServiceError('accountId is required for update action');
      }
      if (!ctx.input.name) {
        throw coinbaseServiceError('name is required for update action');
      }
      let account = await client.updateAccount(ctx.input.accountId, ctx.input.name);
      return {
        output: {
          accountId: account.id,
          accountName: account.name,
          currency: account.currency?.code,
          balanceAmount: account.balance?.amount,
          balanceCurrency: account.balance?.currency,
          nativeBalanceAmount: account.native_balance?.amount,
          nativeBalanceCurrency: account.native_balance?.currency,
          accountType: account.type
        },
        message: `Updated account **${account.name}**`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.accountId) {
        throw coinbaseServiceError('accountId is required for delete action');
      }
      await client.deleteAccount(ctx.input.accountId);
      return {
        output: {
          accountId: ctx.input.accountId,
          deleted: true
        },
        message: `Deleted account **${ctx.input.accountId}**`
      };
    }

    // list
    let result = await client.listAccounts({
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter
    });
    let accounts = result.data || [];
    return {
      output: {
        accounts: accounts.map((a: any) => ({
          accountId: a.id,
          accountName: a.name,
          currency: a.currency?.code,
          balanceAmount: a.balance?.amount,
          balanceCurrency: a.balance?.currency,
          accountType: a.type
        })),
        hasMore: !!result.pagination?.next_uri
      },
      message: `Found **${accounts.length}** account(s)`
    };
  })
  .build();
