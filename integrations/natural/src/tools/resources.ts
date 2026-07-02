import { SlateTool } from 'slates';
import { z } from 'zod';
import { paginationInputFields } from '../lib/pagination';
import { requireConfirm } from '../lib/validation';
import { spec } from '../spec';
import { confirmSchema, rawRecordArraySchema, rawRecordSchema } from './schemas';
import {
  countOf,
  createClient,
  deleteOutput,
  listRawResult,
  resourceResult,
  summaryListMessage
} from './shared';

export const listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description:
    'List Natural transactions. This returns payment and transfer transactions, not payment request records.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      type: z
        .enum(['payment', 'transfer', 'all'])
        .default('all')
        .describe('Transaction type filter.'),
      counterpartyPartyId: z.string().optional().describe('Filter by counterparty party ID.'),
      customerPartyId: z.string().optional().describe('Filter by customer party ID.'),
      delegated: z.boolean().optional().describe('Filter delegated transactions.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      transactions: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('list transactions', 'get', '/transactions', {
      params: {
        type: ctx.input.type,
        counterpartyPartyId: ctx.input.counterpartyPartyId,
        customerPartyId: ctx.input.customerPartyId,
        delegated: ctx.input.delegated,
        limit: ctx.input.limit,
        cursor: ctx.input.cursor
      }
    });
    const output = listRawResult(envelope, 'transactions');

    return {
      output,
      message: summaryListMessage(countOf(output, 'transactions'), 'transactions')
    };
  })
  .build();

export const getTransaction = SlateTool.create(spec, {
  name: 'Get Transaction',
  key: 'get_transaction',
  description: 'Retrieve a Natural transaction by ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      transactionId: z.string().min(1).describe('Natural transaction ID.'),
      partyId: z
        .string()
        .optional()
        .describe('Optional effective party ID for delegated reads.')
    })
  )
  .output(
    z.object({
      transactionId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      transaction: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get transaction',
      'get',
      `/transactions/${ctx.input.transactionId}`,
      {
        params: {
          partyId: ctx.input.partyId
        }
      }
    );

    return {
      output: resourceResult(envelope, 'transactionId', 'transaction'),
      message: `Retrieved transaction **${ctx.input.transactionId}**.`
    };
  })
  .build();

export const listWallets = SlateTool.create(spec, {
  name: 'List Wallets',
  key: 'list_wallets',
  description: 'List Natural wallets, balances, and deposit instructions.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      partyId: z.string().optional().describe('Optional party ID to list wallets for.')
    })
  )
  .output(
    z.object({
      wallets: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('list wallets', 'get', '/wallets', {
      params: {
        partyId: ctx.input.partyId
      }
    });
    const output = listRawResult(envelope, 'wallets');

    return {
      output,
      message: summaryListMessage(countOf(output, 'wallets'), 'wallets')
    };
  })
  .build();

export const getWallet = SlateTool.create(spec, {
  name: 'Get Wallet',
  key: 'get_wallet',
  description: 'Retrieve a Natural wallet by ID, including balance and deposit instructions.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      walletId: z.string().min(1).describe('Natural wallet ID.')
    })
  )
  .output(
    z.object({
      walletId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      wallet: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get wallet',
      'get',
      `/wallets/${ctx.input.walletId}`
    );

    return {
      output: resourceResult(envelope, 'walletId', 'wallet'),
      message: `Retrieved wallet **${ctx.input.walletId}**.`
    };
  })
  .build();

export const listExternalAccounts = SlateTool.create(spec, {
  name: 'List External Accounts',
  key: 'list_external_accounts',
  description:
    'List Natural external bank accounts. REST exposes list and remove, but not link/create.',
  tags: { readOnly: true }
})
  .input(z.object(paginationInputFields))
  .output(
    z.object({
      externalAccounts: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'list external accounts',
      'get',
      '/external-accounts',
      {
        params: {
          cursor: ctx.input.cursor,
          limit: ctx.input.limit
        }
      }
    );
    const output = listRawResult(envelope, 'externalAccounts');

    return {
      output,
      message: summaryListMessage(countOf(output, 'externalAccounts'), 'external accounts')
    };
  })
  .build();

export const removeExternalAccount = SlateTool.create(spec, {
  name: 'Remove External Account',
  key: 'remove_external_account',
  description:
    'Remove a Natural external account. REST does not expose external account creation.',
  tags: { destructive: true }
})
  .input(
    z.object({
      externalAccountId: z.string().min(1).describe('Natural external account ID.'),
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      externalAccountId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      externalAccount: rawRecordSchema,
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'remove this external account');
    const client = createClient(ctx);
    const envelope = await client.request(
      'remove external account',
      'delete',
      `/external-accounts/${ctx.input.externalAccountId}`
    );

    return {
      output: deleteOutput(envelope, 'externalAccountId', 'externalAccount'),
      message: `Removed external account **${ctx.input.externalAccountId}**.`
    };
  })
  .build();

export const listCounterparties = SlateTool.create(spec, {
  name: 'List Counterparties',
  key: 'list_counterparties',
  description: 'List Natural counterparties filtered by sent or received direction.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      direction: z
        .enum(['sent', 'received'])
        .optional()
        .describe('Counterparty direction filter.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      counterparties: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('list counterparties', 'get', '/counterparties', {
      params: {
        direction: ctx.input.direction,
        limit: ctx.input.limit,
        cursor: ctx.input.cursor
      }
    });
    const output = listRawResult(envelope, 'counterparties');

    return {
      output,
      message: summaryListMessage(countOf(output, 'counterparties'), 'counterparties')
    };
  })
  .build();
