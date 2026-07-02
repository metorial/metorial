import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createRefund = SlateTool.create(spec, {
  name: 'Create Refund',
  key: 'create_refund',
  description: `Issue a full or partial refund on a charge or PaymentIntent. Optionally specify a reason for the refund. You can also retrieve existing refunds or list all refunds.`,
  instructions: [
    'Provide either chargeId or paymentIntentId, not both.',
    'Omit amount for a full refund; provide amount for a partial refund (in smallest currency unit).'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list']).describe('Operation to perform'),
      refundId: z.string().optional().describe('Refund ID (for get)'),
      chargeId: z.string().optional().describe('Charge ID to refund'),
      paymentIntentId: z.string().optional().describe('PaymentIntent ID to refund'),
      amount: z
        .number()
        .optional()
        .describe('Amount to refund in smallest currency unit (omit for full refund)'),
      reason: z
        .enum(['duplicate', 'fraudulent', 'requested_by_customer'])
        .optional()
        .describe('Reason for the refund'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata'),
      limit: z.number().optional().describe('Max results (for list)'),
      startingAfter: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      refundId: z.string().optional().describe('Refund ID'),
      amount: z.number().optional().describe('Refund amount'),
      currency: z.string().optional().describe('Currency code'),
      status: z.string().optional().describe('Refund status'),
      chargeId: z.string().optional().nullable().describe('Associated charge ID'),
      paymentIntentId: z
        .string()
        .optional()
        .nullable()
        .describe('Associated PaymentIntent ID'),
      reason: z.string().optional().nullable().describe('Refund reason'),
      created: z.number().optional().describe('Creation timestamp'),
      refunds: z
        .array(
          z.object({
            refundId: z.string(),
            amount: z.number(),
            currency: z.string(),
            status: z.string(),
            created: z.number()
          })
        )
        .optional()
        .describe('List of refunds'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let params: Record<string, any> = {};
      if (ctx.input.chargeId) params.charge = ctx.input.chargeId;
      if (ctx.input.paymentIntentId) params.payment_intent = ctx.input.paymentIntentId;
      if (ctx.input.amount !== undefined) params.amount = ctx.input.amount;
      if (ctx.input.reason) params.reason = ctx.input.reason;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let refund = await client.createRefund(params);
      return {
        output: {
          refundId: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
          chargeId: refund.charge,
          paymentIntentId: refund.payment_intent,
          reason: refund.reason,
          created: refund.created
        },
        message: `Created refund **${refund.id}** for ${refund.amount} ${refund.currency.toUpperCase()} — status: ${refund.status}`
      };
    }

    if (action === 'get') {
      if (!ctx.input.refundId) throw stripeServiceError('refundId is required for get action');
      let refund = await client.getRefund(ctx.input.refundId);
      return {
        output: {
          refundId: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
          chargeId: refund.charge,
          paymentIntentId: refund.payment_intent,
          reason: refund.reason,
          created: refund.created
        },
        message: `Refund **${refund.id}**: ${refund.amount} ${refund.currency.toUpperCase()} — status: ${refund.status}`
      };
    }

    // list
    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;
    if (ctx.input.chargeId) params.charge = ctx.input.chargeId;
    if (ctx.input.paymentIntentId) params.payment_intent = ctx.input.paymentIntentId;

    let result = await client.listRefunds(params);
    return {
      output: {
        refunds: result.data.map((r: any) => ({
          refundId: r.id,
          amount: r.amount,
          currency: r.currency,
          status: r.status,
          created: r.created
        })),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** refund(s)${result.has_more ? ' (more available)' : ''}`
    };
  })
  .build();
