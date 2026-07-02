import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

let paymentSchema = z.object({
  paymentId: z.string().describe('Unique payment identifier'),
  status: z.string().describe('Payment status (draft, open, paid, pending, etc.)'),
  substatus: z.string().nullable().describe('Payment substatus'),
  currency: z.string().describe('Currency code'),
  total: z.number().describe('Total payment amount'),
  subtotal: z.number().nullable().describe('Subtotal before fees'),
  refundedAmount: z.number().describe('Amount already refunded'),
  refundable: z.boolean().describe('Whether payment can be refunded'),
  billingReason: z.string().nullable().describe('Billing reason'),
  userId: z.string().nullable().describe('User ID'),
  username: z.string().nullable().describe('Username'),
  userEmail: z.string().nullable().describe('User email'),
  productId: z.string().nullable().describe('Product ID'),
  productTitle: z.string().nullable().describe('Product title'),
  membershipId: z.string().nullable().describe('Membership ID'),
  paymentMethodType: z
    .string()
    .nullable()
    .describe('Payment method type (card, paypal, etc.)'),
  cardLast4: z.string().nullable().describe('Last 4 digits of card'),
  paidAt: z.string().nullable().describe('ISO 8601 payment timestamp'),
  createdAt: z.string().describe('ISO 8601 creation timestamp')
});

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `List payments in your Whop company. Filter by product, status, billing reason, or search by user. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company ID. Uses config companyId if not provided.'),
      productIds: z.array(z.string()).optional().describe('Filter by product IDs'),
      statuses: z
        .array(
          z.enum(['draft', 'open', 'paid', 'pending', 'uncollectible', 'unresolved', 'void'])
        )
        .optional()
        .describe('Filter by payment status'),
      billingReasons: z
        .array(z.enum(['subscription_create', 'subscription_cycle', 'one_time', 'manual']))
        .optional()
        .describe('Filter by billing reason'),
      query: z.string().optional().describe('Search by user ID, email, name, or username'),
      order: z
        .enum(['final_amount', 'created_at', 'paid_at'])
        .optional()
        .describe('Sort field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Number of results (max 100)')
    })
  )
  .output(
    z.object({
      payments: z.array(paymentSchema),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let companyId = ctx.input.companyId || ctx.config.companyId;

    let client = new WhopClient(ctx.auth.token);
    let result = await client.listPayments({
      companyId,
      productIds: ctx.input.productIds,
      statuses: ctx.input.statuses,
      billingReasons: ctx.input.billingReasons,
      query: ctx.input.query,
      order: ctx.input.order,
      direction: ctx.input.direction,
      after: ctx.input.cursor,
      first: ctx.input.limit
    });

    let payments = (result.data || []).map((p: any) => ({
      paymentId: p.id,
      status: p.status,
      substatus: p.substatus || null,
      currency: p.currency,
      total: p.total,
      subtotal: p.subtotal ?? null,
      refundedAmount: p.refunded_amount || 0,
      refundable: p.refundable || false,
      billingReason: p.billing_reason || null,
      userId: p.user?.id || null,
      username: p.user?.username || null,
      userEmail: p.user?.email || null,
      productId: p.product?.id || null,
      productTitle: p.product?.title || null,
      membershipId: p.membership?.id || null,
      paymentMethodType: p.payment_method_type || null,
      cardLast4: p.card_last4 || null,
      paidAt: p.paid_at || null,
      createdAt: p.created_at
    }));

    return {
      output: {
        payments,
        hasNextPage: result.page_info?.has_next_page || false,
        endCursor: result.page_info?.end_cursor || null
      },
      message: `Found **${payments.length}** payments.${result.page_info?.has_next_page ? ' More results available.' : ''}`
    };
  })
  .build();
