import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createCheckoutSession = SlateTool.create(spec, {
  name: 'Create Checkout Session',
  key: 'create_checkout_session',
  description: `Create a hosted Stripe Checkout session or retrieve an existing one. Checkout provides a pre-built, optimized payment page for one-time payments and subscriptions. Returns a URL to redirect the customer to.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list']).describe('Operation to perform'),
      sessionId: z.string().optional().describe('Session ID (for get)'),
      mode: z
        .enum(['payment', 'subscription', 'setup'])
        .optional()
        .describe('Checkout mode (required for create)'),
      successUrl: z
        .string()
        .optional()
        .describe('URL to redirect after successful payment (required for create)'),
      cancelUrl: z.string().optional().describe('URL to redirect if the customer cancels'),
      customerId: z.string().optional().describe('Existing customer ID'),
      customerEmail: z.string().optional().describe('Pre-fill customer email'),
      lineItems: z
        .array(
          z.object({
            priceId: z.string().describe('Price ID'),
            quantity: z.number().optional().describe('Quantity (default 1)')
          })
        )
        .optional()
        .describe('Line items for the checkout session'),
      allowPromotionCodes: z.boolean().optional().describe('Whether to allow promotion codes'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata'),
      limit: z.number().optional().describe('Max results (for list)'),
      startingAfter: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      sessionId: z.string().optional().describe('Checkout session ID'),
      url: z
        .string()
        .optional()
        .nullable()
        .describe('Checkout page URL (redirect customer here)'),
      status: z.string().optional().nullable().describe('Session status'),
      mode: z.string().optional().describe('Checkout mode'),
      paymentStatus: z.string().optional().describe('Payment status'),
      customerId: z.string().optional().nullable().describe('Customer ID'),
      amountTotal: z
        .number()
        .optional()
        .nullable()
        .describe('Total amount in smallest currency unit'),
      currency: z.string().optional().nullable().describe('Currency code'),
      sessions: z
        .array(
          z.object({
            sessionId: z.string(),
            status: z.string().nullable(),
            mode: z.string(),
            paymentStatus: z.string(),
            amountTotal: z.number().nullable()
          })
        )
        .optional()
        .describe('List of sessions'),
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
      if (!ctx.input.mode) throw stripeServiceError('mode is required for create action');
      if (!ctx.input.successUrl)
        throw stripeServiceError('successUrl is required for create action');

      let params: Record<string, any> = {
        mode: ctx.input.mode,
        success_url: ctx.input.successUrl
      };

      if (ctx.input.cancelUrl) params.cancel_url = ctx.input.cancelUrl;
      if (ctx.input.customerId) params.customer = ctx.input.customerId;
      if (ctx.input.customerEmail) params.customer_email = ctx.input.customerEmail;
      if (ctx.input.allowPromotionCodes !== undefined)
        params.allow_promotion_codes = ctx.input.allowPromotionCodes;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;
      if (ctx.input.lineItems) {
        params.line_items = ctx.input.lineItems.map(item => ({
          price: item.priceId,
          quantity: item.quantity || 1
        }));
      }

      let session = await client.createCheckoutSession(params);
      return {
        output: {
          sessionId: session.id,
          url: session.url,
          status: session.status,
          mode: session.mode,
          paymentStatus: session.payment_status,
          customerId: session.customer,
          amountTotal: session.amount_total,
          currency: session.currency
        },
        message: `Created checkout session **${session.id}**\n\nCheckout URL: ${session.url}`
      };
    }

    if (action === 'get') {
      if (!ctx.input.sessionId)
        throw stripeServiceError('sessionId is required for get action');
      let session = await client.getCheckoutSession(ctx.input.sessionId);
      return {
        output: {
          sessionId: session.id,
          url: session.url,
          status: session.status,
          mode: session.mode,
          paymentStatus: session.payment_status,
          customerId: session.customer,
          amountTotal: session.amount_total,
          currency: session.currency
        },
        message: `Checkout session **${session.id}**: ${session.payment_status}`
      };
    }

    // list
    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;

    let result = await client.listCheckoutSessions(params);
    return {
      output: {
        sessions: result.data.map((s: any) => ({
          sessionId: s.id,
          status: s.status,
          mode: s.mode,
          paymentStatus: s.payment_status,
          amountTotal: s.amount_total
        })),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** checkout session(s)`
    };
  })
  .build();
