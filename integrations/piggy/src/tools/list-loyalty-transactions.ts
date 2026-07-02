import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transactionSchema = z
  .object({
    transactionUuid: z.string().describe('UUID of the transaction'),
    credits: z.number().describe('Number of credits in the transaction'),
    type: z.string().describe('Transaction type (credit_receptions or reward_receptions)'),
    contactUuid: z.string().optional().describe('UUID of the contact'),
    contactEmail: z.string().optional().describe('Email of the contact'),
    shopUuid: z.string().optional().describe('UUID of the shop'),
    unitValue: z.number().optional().describe('Unit value used for the transaction'),
    unitName: z.string().optional().describe('Name of the unit'),
    createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
  })
  .passthrough();

export let listLoyaltyTransactions = SlateTool.create(spec, {
  name: 'List Loyalty Transactions',
  key: 'list_loyalty_transactions',
  description: `List loyalty transactions including credit receptions and reward receptions. Filter by contact, shop, type, and date range to track credit activity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactUuid: z.string().optional().describe('Filter by contact UUID'),
      shopUuid: z.string().optional().describe('Filter by shop UUID'),
      type: z
        .enum(['credit_receptions', 'reward_receptions'])
        .optional()
        .describe('Filter by transaction type'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of transactions per page (max 100)'),
      page: z.number().optional().describe('Page number'),
      sort: z.string().optional().describe('Sort field (e.g. "created_at" or "-created_at")'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter transactions after this ISO 8601 datetime'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter transactions before this ISO 8601 datetime')
    })
  )
  .output(
    z.object({
      transactions: z.array(transactionSchema).describe('List of loyalty transactions'),
      totalCount: z.number().optional().describe('Total number of transactions'),
      currentPage: z.number().optional().describe('Current page number'),
      lastPage: z.number().optional().describe('Last page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listLoyaltyTransactions({
      contactUuid: ctx.input.contactUuid,
      shopUuid: ctx.input.shopUuid,
      type: ctx.input.type,
      limit: ctx.input.limit,
      page: ctx.input.page,
      sort: ctx.input.sort,
      createdAtGt: ctx.input.createdAfter,
      createdAtLt: ctx.input.createdBefore
    });

    let transactions = (result.data || []).map((t: any) => ({
      transactionUuid: t.uuid,
      credits: t.credits,
      type: t.type,
      contactUuid: t.contact?.uuid,
      contactEmail: t.contact?.email,
      shopUuid: t.shop?.uuid,
      unitValue: t.unit_value,
      unitName: t.unit?.name,
      createdAt: t.created_at,
      ...t
    }));

    return {
      output: {
        transactions,
        totalCount: result.meta?.total,
        currentPage: result.meta?.page,
        lastPage: result.meta?.last_page
      },
      message: `Retrieved **${transactions.length}** loyalty transaction(s)${result.meta?.total ? ` out of ${result.meta.total} total` : ''}.`
    };
  })
  .build();
