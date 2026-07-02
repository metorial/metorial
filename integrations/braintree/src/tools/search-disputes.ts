import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeGraphQLClient } from '../lib/client';
import { SEARCH_DISPUTES } from '../lib/graphql-queries';
import { spec } from '../spec';

let dateRangeSchema = z.object({
  after: z.string().optional().describe('Inclusive lower bound as YYYY-MM-DD'),
  before: z.string().optional().describe('Inclusive upper bound as YYYY-MM-DD')
});

let dateRangeFilter = (range?: z.infer<typeof dateRangeSchema>) => {
  if (!range) return undefined;
  let filter: Record<string, string> = {};
  if (range.after) filter.greaterThanOrEqualTo = range.after;
  if (range.before) filter.lessThanOrEqualTo = range.before;
  return Object.keys(filter).length > 0 ? filter : undefined;
};

export let searchDisputes = SlateTool.create(spec, {
  name: 'Search Disputes',
  key: 'search_disputes',
  description: `Searches Braintree disputes by ID, status, type, reason, transaction, customer, or deadline dates. Use this to discover open disputes before adding evidence, accepting, or finalizing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      disputeId: z.string().optional().describe('Exact dispute ID to find'),
      statuses: z.array(z.string()).optional().describe('Dispute statuses to include'),
      type: z.string().optional().describe('Dispute type, such as CHARGEBACK or RETRIEVAL'),
      reason: z.string().optional().describe('Dispute reason enum value'),
      transactionId: z.string().optional().describe('Associated transaction ID'),
      customerId: z.string().optional().describe('Associated customer ID'),
      receivedDate: dateRangeSchema.optional().describe('Received-date range'),
      replyByDate: dateRangeSchema.optional().describe('Reply-by date range'),
      first: z.number().int().min(1).max(50).default(20).describe('Results to return'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      disputes: z.array(
        z.object({
          disputeId: z.string().describe('Legacy dispute ID'),
          graphQLId: z.string().describe('GraphQL dispute ID'),
          status: z.string().optional().nullable(),
          type: z.string().optional().nullable(),
          reason: z.string().optional().nullable(),
          reasonCode: z.string().optional().nullable(),
          reasonDescription: z.string().optional().nullable(),
          amount: z.string().optional().nullable(),
          currencyCode: z.string().optional().nullable(),
          receivedDate: z.string().optional().nullable(),
          replyByDate: z.string().optional().nullable(),
          transactionId: z.string().optional().nullable(),
          createdAt: z.string().optional().nullable()
        })
      ),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().optional().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BraintreeGraphQLClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let input: Record<string, any> = {};
    if (ctx.input.disputeId) input.id = { is: ctx.input.disputeId };
    if (ctx.input.statuses?.length) input.status = { in: ctx.input.statuses };
    if (ctx.input.type) input.type = { is: ctx.input.type };
    if (ctx.input.reason) input.reason = { in: [ctx.input.reason] };
    if (ctx.input.transactionId || ctx.input.customerId) {
      input.transaction = {};
      if (ctx.input.transactionId)
        input.transaction.transactionId = { is: ctx.input.transactionId };
      if (ctx.input.customerId) input.transaction.customerId = { is: ctx.input.customerId };
    }
    let receivedDate = dateRangeFilter(ctx.input.receivedDate);
    if (receivedDate) input.receivedDate = receivedDate;
    let replyByDate = dateRangeFilter(ctx.input.replyByDate);
    if (replyByDate) input.replyByDate = replyByDate;

    let result = await client.query(
      SEARCH_DISPUTES,
      {
        input,
        first: ctx.input.first,
        after: ctx.input.after || null
      },
      'search disputes'
    );
    let connection = result.search.disputes;
    let disputes = (connection.edges || []).map((edge: any) => ({
      disputeId: edge.node.legacyId || edge.node.id,
      graphQLId: edge.node.id,
      status: edge.node.status,
      type: edge.node.type,
      reason: edge.node.processorResponse?.reason,
      reasonCode: edge.node.processorResponse?.reasonCode,
      reasonDescription: edge.node.processorResponse?.reasonDescription,
      amount: edge.node.amountDisputed?.value,
      currencyCode: edge.node.amountDisputed?.currencyCode,
      receivedDate: edge.node.receivedDate,
      replyByDate: edge.node.replyByDate,
      transactionId: edge.node.transaction?.legacyId || edge.node.transaction?.id,
      createdAt: edge.node.createdAt
    }));

    return {
      output: {
        disputes,
        hasNextPage: connection.pageInfo?.hasNextPage || false,
        endCursor: connection.pageInfo?.endCursor
      },
      message: `Found **${disputes.length}** Braintree dispute(s)${connection.pageInfo?.hasNextPage ? ' (more available)' : ''}`
    };
  })
  .build();
