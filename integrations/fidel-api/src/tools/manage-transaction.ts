import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transactionSchema = z.object({
  transactionId: z.string().describe('Unique identifier of the transaction'),
  programId: z.string().optional().describe('ID of the program'),
  cardId: z.string().optional().describe('Token ID of the card used'),
  locationId: z
    .string()
    .optional()
    .describe('ID of the location where the transaction occurred'),
  brandId: z.string().optional().describe('ID of the brand'),
  accountId: z.string().optional().describe('Account ID'),
  amount: z.number().optional().describe('Transaction amount'),
  currency: z.string().optional().describe('ISO 4217 currency code'),
  scheme: z.string().optional().describe('Card network (visa, mastercard, amex)'),
  lastNumbers: z.string().optional().describe('Last four digits of the card'),
  firstNumbers: z.string().optional().describe('First six digits of the card (BIN)'),
  auth: z.boolean().optional().describe('Whether this is an authorization event'),
  cleared: z.boolean().optional().describe('Whether the transaction has been cleared/settled'),
  live: z.boolean().optional().describe('Whether this is a live transaction'),
  merchantId: z.string().optional().describe('Merchant Identifier'),
  merchantName: z.string().optional().describe('Merchant name'),
  wallet: z.string().optional().nullable().describe('Digital wallet type if applicable'),
  created: z.string().optional().describe('ISO 8601 date when the transaction was created'),
  updated: z
    .string()
    .optional()
    .describe('ISO 8601 date when the transaction was last updated'),
  datetime: z.string().optional().describe('ISO 8601 date of the transaction'),
  offer: z
    .record(z.string(), z.any())
    .optional()
    .nullable()
    .describe('Offer qualification details if applicable')
});

export let getTransaction = SlateTool.create(spec, {
  name: 'Get Transaction',
  key: 'get_transaction',
  description: `Retrieves details of a specific transaction by its ID. Returns the full transaction record including amount, currency, card details, merchant info, and any offer qualification data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('ID of the transaction to retrieve'),
      programId: z.string().describe('ID of the program the transaction belongs to')
    })
  )
  .output(transactionSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let tx = await client.getTransaction(ctx.input.transactionId, ctx.input.programId);

    return {
      output: {
        transactionId: tx.id,
        programId: tx.programId,
        cardId: tx.cardId ?? tx.card?.id,
        locationId: tx.locationId ?? tx.location?.id,
        brandId: tx.brandId ?? tx.brand?.id,
        accountId: tx.accountId,
        amount: tx.amount,
        currency: tx.currency,
        scheme: tx.scheme,
        lastNumbers: tx.lastNumbers ?? tx.card?.lastNumbers,
        firstNumbers: tx.firstNumbers ?? tx.card?.firstNumbers,
        auth: tx.auth,
        cleared: tx.cleared,
        live: tx.live,
        merchantId: tx.identifiers?.MID ?? tx.merchantId,
        merchantName: tx.merchantName ?? tx.location?.address,
        wallet: tx.wallet,
        created: tx.created,
        updated: tx.updated,
        datetime: tx.datetime,
        offer: tx.offer
      },
      message: `Retrieved transaction \`${tx.id}\` for **${tx.currency} ${tx.amount}**.`
    };
  })
  .build();

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Lists transactions for a Program or a specific Card. Supports filtering by date range. Returns authorization, clearing, and refund events with full transaction details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: z.string().describe('ID of the program to list transactions for'),
      cardId: z
        .string()
        .optional()
        .describe('Optional card ID to filter transactions for a specific card'),
      from: z.string().optional().describe('Start date for filtering (ISO 8601 format)'),
      to: z.string().optional().describe('End date for filtering (ISO 8601 format)'),
      start: z.number().optional().describe('Offset for pagination'),
      limit: z.number().optional().describe('Maximum number of transactions to return')
    })
  )
  .output(
    z.object({
      transactions: z.array(transactionSchema).describe('List of transactions'),
      count: z.number().optional().describe('Total number of transactions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: any;
    if (ctx.input.cardId) {
      data = await client.listTransactionsByCard(ctx.input.cardId, ctx.input.programId, {
        from: ctx.input.from,
        to: ctx.input.to,
        start: ctx.input.start,
        limit: ctx.input.limit
      });
    } else {
      data = await client.listTransactionsByProgram(ctx.input.programId, {
        from: ctx.input.from,
        to: ctx.input.to,
        start: ctx.input.start,
        limit: ctx.input.limit
      });
    }

    let items = data?.items ?? [];
    let transactions = items.map((tx: any) => ({
      transactionId: tx.id,
      programId: tx.programId,
      cardId: tx.cardId ?? tx.card?.id,
      locationId: tx.locationId ?? tx.location?.id,
      brandId: tx.brandId ?? tx.brand?.id,
      accountId: tx.accountId,
      amount: tx.amount,
      currency: tx.currency,
      scheme: tx.scheme,
      lastNumbers: tx.lastNumbers ?? tx.card?.lastNumbers,
      firstNumbers: tx.firstNumbers ?? tx.card?.firstNumbers,
      auth: tx.auth,
      cleared: tx.cleared,
      live: tx.live,
      merchantId: tx.identifiers?.MID ?? tx.merchantId,
      merchantName: tx.merchantName ?? tx.location?.address,
      wallet: tx.wallet,
      created: tx.created,
      updated: tx.updated,
      datetime: tx.datetime,
      offer: tx.offer
    }));

    return {
      output: {
        transactions,
        count: data?.resource?.total ?? transactions.length
      },
      message: `Found **${transactions.length}** transaction(s)${ctx.input.cardId ? ` for card \`${ctx.input.cardId}\`` : ''}.`
    };
  })
  .build();

export let createTestTransaction = SlateTool.create(spec, {
  name: 'Create Test Transaction',
  key: 'create_test_transaction',
  description: `Creates a test transaction for development and testing purposes. Only works in test mode. Simulates a payment at a specific location with a linked card.`,
  instructions: ['This endpoint only works with test mode API keys (sk_test_*).'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      programId: z.string().describe('ID of the program'),
      cardId: z.string().describe('ID of the card to simulate a transaction for'),
      locationId: z
        .string()
        .describe('ID of the location where the simulated transaction occurs'),
      amount: z.number().describe('Transaction amount'),
      currency: z.string().describe('ISO 4217 currency code (e.g., GBP, USD, EUR)')
    })
  )
  .output(transactionSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let tx = await client.createTestTransaction(ctx.input.programId, {
      amount: ctx.input.amount,
      cardId: ctx.input.cardId,
      locationId: ctx.input.locationId,
      currency: ctx.input.currency
    });

    return {
      output: {
        transactionId: tx.id,
        programId: tx.programId,
        cardId: tx.cardId ?? tx.card?.id,
        locationId: tx.locationId ?? tx.location?.id,
        brandId: tx.brandId ?? tx.brand?.id,
        accountId: tx.accountId,
        amount: tx.amount,
        currency: tx.currency,
        scheme: tx.scheme,
        lastNumbers: tx.lastNumbers ?? tx.card?.lastNumbers,
        firstNumbers: tx.firstNumbers ?? tx.card?.firstNumbers,
        auth: tx.auth,
        cleared: tx.cleared,
        live: tx.live,
        merchantId: tx.identifiers?.MID ?? tx.merchantId,
        merchantName: tx.merchantName,
        wallet: tx.wallet,
        created: tx.created,
        updated: tx.updated,
        datetime: tx.datetime,
        offer: tx.offer
      },
      message: `Test transaction created for **${ctx.input.currency} ${ctx.input.amount}** at location \`${ctx.input.locationId}\`.`
    };
  })
  .build();
