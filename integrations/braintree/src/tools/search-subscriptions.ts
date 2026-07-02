import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeGraphQLClient } from '../lib/client';
import { SEARCH_SUBSCRIPTIONS } from '../lib/graphql-queries';
import { spec } from '../spec';

let dateRangeSchema = z.object({
  after: z.string().optional().describe('Inclusive lower bound'),
  before: z.string().optional().describe('Upper bound')
});

let dateRangeFilter = (range?: z.infer<typeof dateRangeSchema>) => {
  if (!range) return undefined;
  let filter: Record<string, string> = {};
  if (range.after) filter.greaterThanOrEqualTo = range.after;
  if (range.before) filter.lessThanOrEqualTo = range.before;
  return Object.keys(filter).length > 0 ? filter : undefined;
};

export let searchSubscriptions = SlateTool.create(spec, {
  name: 'Search Subscriptions',
  key: 'search_subscriptions',
  description: `Searches Braintree recurring billing subscriptions by ID, plan, status, merchant account, transaction, trial state, and billing dates. Use this before finding, updating, retrying, or canceling subscriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriptionId: z.string().optional().describe('Exact subscription ID to find'),
      planId: z.string().optional().describe('Plan ID filter'),
      statuses: z.array(z.string()).optional().describe('Subscription statuses to include'),
      merchantAccountId: z.string().optional().describe('Merchant account ID filter'),
      inTrialPeriod: z.boolean().optional().describe('Whether the subscription is in trial'),
      transactionId: z.string().optional().describe('Associated transaction ID'),
      createdAt: dateRangeSchema.optional().describe('Created-at timestamp range'),
      nextBillingDate: dateRangeSchema.optional().describe('Next billing date range'),
      first: z.number().int().min(1).max(50).default(20).describe('Results to return'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      subscriptions: z.array(
        z.object({
          subscriptionId: z.string().describe('Legacy subscription ID'),
          graphQLId: z.string().describe('GraphQL subscription ID'),
          planId: z.string().optional().nullable(),
          status: z.string().optional().nullable(),
          paymentMethodId: z.string().optional().nullable(),
          merchantAccountId: z.string().optional().nullable(),
          price: z.string().optional().nullable(),
          currencyCode: z.string().optional().nullable(),
          balance: z.string().optional().nullable(),
          billingDayOfMonth: z.number().optional().nullable(),
          currentBillingCycle: z.number().optional().nullable(),
          numberOfBillingCycles: z.number().optional().nullable(),
          failureCount: z.number().optional().nullable(),
          daysPastDue: z.number().optional().nullable(),
          firstBillingDate: z.string().optional().nullable(),
          nextBillingDate: z.string().optional().nullable(),
          billingPeriodEndDate: z.string().optional().nullable(),
          paidThroughDate: z.string().optional().nullable()
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
    if (ctx.input.subscriptionId) input.id = { is: ctx.input.subscriptionId };
    if (ctx.input.planId) input.planId = { is: ctx.input.planId };
    if (ctx.input.statuses?.length) input.status = ctx.input.statuses;
    if (ctx.input.merchantAccountId)
      input.merchantAccountId = { is: ctx.input.merchantAccountId };
    if (ctx.input.inTrialPeriod !== undefined) input.inTrialPeriod = ctx.input.inTrialPeriod;
    if (ctx.input.transactionId) input.transactionId = { is: ctx.input.transactionId };
    let createdAt = dateRangeFilter(ctx.input.createdAt);
    if (createdAt) input.createdAt = createdAt;
    let nextBillingDate = dateRangeFilter(ctx.input.nextBillingDate);
    if (nextBillingDate) input.nextBillingDate = nextBillingDate;

    let result = await client.query(
      SEARCH_SUBSCRIPTIONS,
      {
        input,
        first: ctx.input.first,
        after: ctx.input.after || null
      },
      'search subscriptions'
    );
    let connection = result.search.recurringBillingSubscriptions;
    let subscriptions = (connection.edges || []).map((edge: any) => ({
      subscriptionId: edge.node.legacyId || edge.node.id,
      graphQLId: edge.node.id,
      planId: edge.node.planId,
      status: edge.node.status,
      paymentMethodId: edge.node.paymentMethodId,
      merchantAccountId: edge.node.merchantAccountId,
      price: edge.node.price,
      balance: edge.node.balance,
      billingDayOfMonth: edge.node.billingDayOfMonth,
      currentBillingCycle: edge.node.currentBillingCycle,
      numberOfBillingCycles: edge.node.numberOfBillingCycles,
      failureCount: edge.node.failureCount,
      daysPastDue: edge.node.daysPastDue,
      firstBillingDate: edge.node.timeline?.firstBillingDate,
      nextBillingDate: edge.node.timeline?.nextBillingDate,
      billingPeriodEndDate: edge.node.timeline?.billingPeriodEndDate,
      paidThroughDate: edge.node.timeline?.paidThroughDate
    }));

    return {
      output: {
        subscriptions,
        hasNextPage: connection.pageInfo?.hasNextPage || false,
        endCursor: connection.pageInfo?.endCursor
      },
      message: `Found **${subscriptions.length}** Braintree subscription(s)${connection.pageInfo?.hasNextPage ? ' (more available)' : ''}`
    };
  })
  .build();
