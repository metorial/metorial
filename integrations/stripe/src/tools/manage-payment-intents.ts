import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let managePaymentIntents = SlateTool.create(spec, {
  name: 'Manage Payment Intents',
  key: 'manage_payment_intents',
  description: `Create, retrieve, update, confirm, capture, or cancel PaymentIntents. PaymentIntents orchestrate the full payment lifecycle, supporting authorization, capture, and confirmation across many payment methods and currencies.`,
  instructions: [
    'Amount is in the smallest currency unit (e.g., cents for USD). For example, $10.00 = 1000.',
    'Use "manual" capture_method for auth-then-capture flows; use capture action to finalize.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'confirm', 'capture', 'cancel', 'list'])
        .describe('Operation to perform'),
      paymentIntentId: z
        .string()
        .optional()
        .describe('PaymentIntent ID (required for get/update/confirm/capture/cancel)'),
      amount: z.number().optional().describe('Amount in smallest currency unit (e.g., cents)'),
      currency: z
        .string()
        .optional()
        .describe('Three-letter ISO currency code (e.g., usd, eur)'),
      customerId: z.string().optional().describe('Customer ID to attach the payment to'),
      paymentMethodId: z.string().optional().describe('Payment method ID to use'),
      description: z.string().optional().describe('Description of the payment'),
      captureMethod: z
        .enum(['automatic', 'manual'])
        .optional()
        .describe('Whether to auto-capture or require explicit capture'),
      confirmationMethod: z
        .enum(['automatic', 'manual'])
        .optional()
        .describe('How to confirm the PaymentIntent'),
      receiptEmail: z.string().optional().describe('Email address to send the receipt to'),
      statementDescriptor: z
        .string()
        .optional()
        .describe('Statement descriptor for the charge (max 22 chars)'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata'),
      amountToCapture: z
        .number()
        .optional()
        .describe('Amount to capture (for partial capture)'),
      cancellationReason: z
        .enum(['duplicate', 'fraudulent', 'requested_by_customer', 'abandoned'])
        .optional()
        .describe('Reason for cancellation'),
      limit: z.number().optional().describe('Max results to return (for list)'),
      startingAfter: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      paymentIntentId: z.string().optional().describe('PaymentIntent ID'),
      amount: z.number().optional().describe('Amount in smallest currency unit'),
      currency: z.string().optional().describe('Currency code'),
      status: z
        .string()
        .optional()
        .describe(
          'Current status (requires_payment_method, requires_confirmation, requires_action, processing, requires_capture, canceled, succeeded)'
        ),
      customerId: z.string().optional().nullable().describe('Associated customer ID'),
      clientSecret: z
        .string()
        .optional()
        .nullable()
        .describe('Client secret for client-side confirmation'),
      created: z.number().optional().describe('Creation timestamp'),
      paymentIntents: z
        .array(
          z.object({
            paymentIntentId: z.string(),
            amount: z.number(),
            currency: z.string(),
            status: z.string(),
            created: z.number()
          })
        )
        .optional()
        .describe('List of PaymentIntents'),
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
      if (!ctx.input.amount) throw stripeServiceError('amount is required for create action');
      if (!ctx.input.currency)
        throw stripeServiceError('currency is required for create action');

      let params: Record<string, any> = {
        amount: ctx.input.amount,
        currency: ctx.input.currency
      };
      if (ctx.input.customerId) params.customer = ctx.input.customerId;
      if (ctx.input.paymentMethodId) params.payment_method = ctx.input.paymentMethodId;
      if (ctx.input.description) params.description = ctx.input.description;
      if (ctx.input.captureMethod) params.capture_method = ctx.input.captureMethod;
      if (ctx.input.confirmationMethod)
        params.confirmation_method = ctx.input.confirmationMethod;
      if (ctx.input.receiptEmail) params.receipt_email = ctx.input.receiptEmail;
      if (ctx.input.statementDescriptor)
        params.statement_descriptor = ctx.input.statementDescriptor;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let pi = await client.createPaymentIntent(params);
      return {
        output: {
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          customerId: pi.customer,
          clientSecret: pi.client_secret,
          created: pi.created
        },
        message: `Created PaymentIntent **${pi.id}** for ${pi.amount} ${pi.currency.toUpperCase()} — status: ${pi.status}`
      };
    }

    if (action === 'get') {
      if (!ctx.input.paymentIntentId)
        throw stripeServiceError('paymentIntentId is required for get action');
      let pi = await client.getPaymentIntent(ctx.input.paymentIntentId);
      return {
        output: {
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          customerId: pi.customer,
          clientSecret: pi.client_secret,
          created: pi.created
        },
        message: `PaymentIntent **${pi.id}**: ${pi.amount} ${pi.currency.toUpperCase()} — status: ${pi.status}`
      };
    }

    if (action === 'update') {
      if (!ctx.input.paymentIntentId)
        throw stripeServiceError('paymentIntentId is required for update action');
      let params: Record<string, any> = {};
      if (ctx.input.amount !== undefined) params.amount = ctx.input.amount;
      if (ctx.input.currency) params.currency = ctx.input.currency;
      if (ctx.input.customerId) params.customer = ctx.input.customerId;
      if (ctx.input.paymentMethodId) params.payment_method = ctx.input.paymentMethodId;
      if (ctx.input.description) params.description = ctx.input.description;
      if (ctx.input.receiptEmail) params.receipt_email = ctx.input.receiptEmail;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let pi = await client.updatePaymentIntent(ctx.input.paymentIntentId, params);
      return {
        output: {
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          customerId: pi.customer,
          clientSecret: pi.client_secret,
          created: pi.created
        },
        message: `Updated PaymentIntent **${pi.id}** — status: ${pi.status}`
      };
    }

    if (action === 'confirm') {
      if (!ctx.input.paymentIntentId)
        throw stripeServiceError('paymentIntentId is required for confirm action');
      let params: Record<string, any> = {};
      if (ctx.input.paymentMethodId) params.payment_method = ctx.input.paymentMethodId;
      let pi = await client.confirmPaymentIntent(ctx.input.paymentIntentId, params);
      return {
        output: {
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          customerId: pi.customer,
          created: pi.created
        },
        message: `Confirmed PaymentIntent **${pi.id}** — status: ${pi.status}`
      };
    }

    if (action === 'capture') {
      if (!ctx.input.paymentIntentId)
        throw stripeServiceError('paymentIntentId is required for capture action');
      let params: Record<string, any> = {};
      if (ctx.input.amountToCapture !== undefined)
        params.amount_to_capture = ctx.input.amountToCapture;
      let pi = await client.capturePaymentIntent(ctx.input.paymentIntentId, params);
      return {
        output: {
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          customerId: pi.customer,
          created: pi.created
        },
        message: `Captured PaymentIntent **${pi.id}** — ${pi.amount} ${pi.currency.toUpperCase()}`
      };
    }

    if (action === 'cancel') {
      if (!ctx.input.paymentIntentId)
        throw stripeServiceError('paymentIntentId is required for cancel action');
      let params: Record<string, any> = {};
      if (ctx.input.cancellationReason)
        params.cancellation_reason = ctx.input.cancellationReason;
      let pi = await client.cancelPaymentIntent(ctx.input.paymentIntentId, params);
      return {
        output: {
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          customerId: pi.customer,
          created: pi.created
        },
        message: `Canceled PaymentIntent **${pi.id}**`
      };
    }

    // list
    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;
    if (ctx.input.customerId) params.customer = ctx.input.customerId;

    let result = await client.listPaymentIntents(params);
    return {
      output: {
        paymentIntents: result.data.map((pi: any) => ({
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          created: pi.created
        })),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** PaymentIntent(s)${result.has_more ? ' (more available)' : ''}`
    };
  })
  .build();
