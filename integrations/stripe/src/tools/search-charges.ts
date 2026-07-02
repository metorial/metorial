import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let searchCharges = SlateTool.create(spec, {
  name: 'Search Charges',
  key: 'search_charges',
  description: `Retrieve a specific charge or list charges with optional filters. Charges represent completed or attempted payment transactions. Use this to inspect payment details, outcomes, and related metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'list']).describe('Operation to perform'),
      chargeId: z.string().optional().describe('Charge ID (for get)'),
      customerId: z.string().optional().describe('Filter by customer ID'),
      paymentIntentId: z.string().optional().describe('Filter by PaymentIntent ID'),
      limit: z.number().optional().describe('Max results (for list)'),
      startingAfter: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      chargeId: z.string().optional().describe('Charge ID'),
      amount: z.number().optional().describe('Charge amount'),
      currency: z.string().optional().describe('Currency code'),
      status: z.string().optional().describe('Charge status (succeeded, pending, failed)'),
      paid: z.boolean().optional().describe('Whether the charge was paid'),
      refunded: z.boolean().optional().describe('Whether the charge was refunded'),
      amountRefunded: z.number().optional().describe('Amount refunded'),
      customerId: z.string().optional().nullable().describe('Associated customer ID'),
      paymentIntentId: z
        .string()
        .optional()
        .nullable()
        .describe('Associated PaymentIntent ID'),
      receiptUrl: z.string().optional().nullable().describe('URL for the charge receipt'),
      description: z.string().optional().nullable().describe('Charge description'),
      created: z.number().optional().describe('Creation timestamp'),
      charges: z
        .array(
          z.object({
            chargeId: z.string(),
            amount: z.number(),
            currency: z.string(),
            status: z.string(),
            paid: z.boolean(),
            customerId: z.string().nullable(),
            created: z.number()
          })
        )
        .optional()
        .describe('List of charges'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let { action } = ctx.input;

    if (action === 'get') {
      if (!ctx.input.chargeId) throw stripeServiceError('chargeId is required for get action');
      let charge = await client.getCharge(ctx.input.chargeId);
      return {
        output: {
          chargeId: charge.id,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.status,
          paid: charge.paid,
          refunded: charge.refunded,
          amountRefunded: charge.amount_refunded,
          customerId: charge.customer,
          paymentIntentId: charge.payment_intent,
          receiptUrl: charge.receipt_url,
          description: charge.description,
          created: charge.created
        },
        message: `Charge **${charge.id}**: ${charge.amount} ${charge.currency.toUpperCase()} — ${charge.status}${charge.refunded ? ' (refunded)' : ''}`
      };
    }

    // list
    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;
    if (ctx.input.customerId) params.customer = ctx.input.customerId;
    if (ctx.input.paymentIntentId) params.payment_intent = ctx.input.paymentIntentId;

    let result = await client.listCharges(params);
    return {
      output: {
        charges: result.data.map((c: any) => ({
          chargeId: c.id,
          amount: c.amount,
          currency: c.currency,
          status: c.status,
          paid: c.paid,
          customerId: c.customer,
          created: c.created
        })),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** charge(s)${result.has_more ? ' (more available)' : ''}`
    };
  })
  .build();
