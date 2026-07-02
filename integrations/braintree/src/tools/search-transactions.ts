import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeGraphQLClient } from '../lib/client';
import { SEARCH_TRANSACTION } from '../lib/graphql-queries';
import { spec } from '../spec';

export let searchTransactions = SlateTool.create(spec, {
  name: 'Search Transactions',
  key: 'search_transactions',
  description: `Searches for transactions in Braintree using various filter criteria. Returns a paginated list of matching transactions.
Supports filtering by status, amount range, date range, customer, and payment method type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum([
          'AUTHORIZED',
          'AUTHORIZING',
          'AUTHORIZATION_EXPIRED',
          'FAILED',
          'GATEWAY_REJECTED',
          'PROCESSOR_DECLINED',
          'SETTLED',
          'SETTLING',
          'SETTLEMENT_CONFIRMED',
          'SETTLEMENT_DECLINED',
          'SETTLEMENT_PENDING',
          'SUBMITTED_FOR_SETTLEMENT',
          'VOIDED'
        ])
        .optional()
        .describe('Filter by transaction status'),
      amount: z
        .object({
          min: z.string().optional().describe('Minimum amount'),
          max: z.string().optional().describe('Maximum amount')
        })
        .optional()
        .describe('Filter by amount range'),
      createdAt: z
        .object({
          after: z.string().optional().describe('Created after this ISO date'),
          before: z.string().optional().describe('Created before this ISO date')
        })
        .optional()
        .describe('Filter by creation date range'),
      customerId: z.string().optional().describe('Filter by customer legacy ID'),
      orderId: z.string().optional().describe('Filter by order ID'),
      first: z
        .number()
        .optional()
        .default(20)
        .describe('Number of results to return (max 50)'),
      after: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      transactions: z.array(
        z.object({
          transactionId: z.string().describe('GraphQL transaction ID'),
          legacyId: z.string().describe('Legacy transaction ID'),
          status: z.string().describe('Transaction status'),
          amount: z.string().describe('Transaction amount'),
          currencyCode: z.string().describe('Currency code'),
          orderId: z.string().optional().nullable(),
          customerEmail: z.string().optional().nullable(),
          createdAt: z.string().optional()
        })
      ),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().optional().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BraintreeGraphQLClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let searchInput: Record<string, any> = {};

    if (ctx.input.status) {
      searchInput.status = { is: ctx.input.status };
    }
    if (ctx.input.amount) {
      searchInput.amount = {};
      if (ctx.input.amount.min) searchInput.amount.greaterThanOrEqualTo = ctx.input.amount.min;
      if (ctx.input.amount.max) searchInput.amount.lessThanOrEqualTo = ctx.input.amount.max;
    }
    if (ctx.input.createdAt) {
      searchInput.createdAt = {};
      if (ctx.input.createdAt.after)
        searchInput.createdAt.greaterThanOrEqualTo = ctx.input.createdAt.after;
      if (ctx.input.createdAt.before)
        searchInput.createdAt.lessThanOrEqualTo = ctx.input.createdAt.before;
    }
    if (ctx.input.customerId) {
      searchInput.customer = { id: { is: ctx.input.customerId } };
    }
    if (ctx.input.orderId) {
      searchInput.orderId = { is: ctx.input.orderId };
    }

    let result = await client.query(SEARCH_TRANSACTION, {
      input: searchInput,
      first: Math.min(ctx.input.first || 20, 50),
      after: ctx.input.after || null
    });

    let connection = result.search.transactions;
    let transactions = (connection.edges || []).map((edge: any) => ({
      transactionId: edge.node.id,
      legacyId: edge.node.legacyId,
      status: edge.node.status,
      amount: edge.node.amount?.value || '',
      currencyCode: edge.node.amount?.currencyCode || '',
      orderId: edge.node.orderId,
      customerEmail: edge.node.customer?.email,
      createdAt: edge.node.createdAt
    }));

    return {
      output: {
        transactions,
        hasNextPage: connection.pageInfo?.hasNextPage || false,
        endCursor: connection.pageInfo?.endCursor
      },
      message: `Found **${transactions.length}** transaction(s)${connection.pageInfo?.hasNextPage ? ' (more available)' : ''}`
    };
  })
  .build();
