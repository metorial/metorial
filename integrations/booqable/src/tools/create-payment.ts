import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, requireValue, validateNumber } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let createPayment = SlateTool.create(spec, {
  name: 'Create Payment',
  key: 'create_payment',
  description: `Create a payment charge, authorization, or refund. Charges process direct payments, authorizations hold funds for later capture, and refunds return funds from previous charges.`,
  instructions: [
    'For charges: provide orderId and amountInCents at minimum.',
    'For connected refunds, provide paymentChargeId. Refunds do not accept mode or paymentMethodId.',
    'Use get_payment to check the actual payment status after creation; creation alone does not prove funds were collected.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      paymentType: z
        .enum(['charge', 'authorization', 'refund'])
        .describe('Type of payment to create'),
      orderId: z.string().describe('Order ID to associate the payment with'),
      amountInCents: z.number().describe('Amount in cents'),
      mode: z
        .enum(['manual', 'off_session', 'request', 'terminal', 'capture'])
        .optional()
        .describe(
          'Charge mode; authorizations support off_session, request, or terminal. Omit for refunds.'
        ),
      paymentMethodId: z
        .string()
        .optional()
        .describe(
          'Saved payment method ID. Call list_payment_methods to discover IDs. Not accepted for refunds.'
        ),
      provider: z.enum(['stripe', 'app', 'none']).optional().describe('Payment provider'),
      paymentChargeId: z
        .string()
        .optional()
        .describe(
          'Original successful charge ID for a connected refund. Use list_payments to discover IDs.'
        ),
      paymentAuthorizationId: z
        .string()
        .optional()
        .describe(
          'Existing authorization ID required for capture charges. Use list_payments to discover IDs.'
        ),
      depositInCents: z.number().optional().describe('Separate deposit amount in whole cents'),
      description: z.string().optional().describe('Payment description or refund explanation')
    })
  )
  .output(
    z.object({
      payment: z.record(z.string(), z.any()).describe('The created payment record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    validateNumber(ctx.input.amountInCents, 'Amount in cents', { integer: true, min: 0 });
    validateNumber(ctx.input.depositInCents, 'Deposit in cents', { integer: true, min: 0 });
    if (ctx.input.amountInCents + (ctx.input.depositInCents ?? 0) <= 0)
      throw createApiServiceError('The total payment amount must be greater than zero.');
    if (
      ctx.input.paymentType === 'refund' &&
      (ctx.input.mode !== undefined ||
        ctx.input.paymentMethodId !== undefined ||
        ctx.input.paymentAuthorizationId !== undefined)
    ) {
      throw createApiServiceError(
        'Refunds do not accept mode, paymentMethodId, or paymentAuthorizationId. Use paymentChargeId for a connected refund.'
      );
    }
    if (ctx.input.paymentType !== 'refund' && ctx.input.paymentChargeId !== undefined)
      throw createApiServiceError('paymentChargeId is only used for refunds.');
    if (ctx.input.paymentType !== 'charge' && ctx.input.paymentAuthorizationId !== undefined)
      throw createApiServiceError('paymentAuthorizationId is only used for capture charges.');
    if (
      ctx.input.paymentType === 'authorization' &&
      (ctx.input.mode === 'manual' || ctx.input.mode === 'capture')
    )
      throw createApiServiceError(
        'Authorizations require off_session, request, or terminal mode.'
      );
    if (ctx.input.mode === 'off_session')
      requireValue(ctx.input.paymentMethodId, 'Saved payment method ID for off_session');
    if (ctx.input.mode === 'capture')
      requireValue(ctx.input.paymentAuthorizationId, 'Payment authorization ID for capture');
    if (ctx.input.paymentAuthorizationId !== undefined && ctx.input.mode !== 'capture')
      throw createApiServiceError(
        'Set mode to capture when supplying paymentAuthorizationId.'
      );
    if (ctx.input.mode === 'manual' && ctx.input.provider && ctx.input.provider !== 'none')
      throw createApiServiceError('Manual charges use provider none.');
    if (
      ctx.input.paymentType === 'refund' &&
      ctx.input.provider &&
      ctx.input.provider !== 'none'
    )
      requireValue(ctx.input.paymentChargeId, 'Original charge ID for a provider refund');

    let attributes: Record<string, any> = {
      order_id: ctx.input.orderId,
      amount_in_cents: ctx.input.amountInCents
    };

    if (ctx.input.mode) attributes.mode = ctx.input.mode;
    if (ctx.input.paymentMethodId) attributes.payment_method_id = ctx.input.paymentMethodId;
    if (ctx.input.provider) attributes.provider = ctx.input.provider;

    if (ctx.input.paymentChargeId !== undefined)
      attributes.payment_charge_id = ctx.input.paymentChargeId;
    if (ctx.input.paymentAuthorizationId !== undefined)
      attributes.payment_authorization_id = ctx.input.paymentAuthorizationId;
    if (ctx.input.depositInCents !== undefined)
      attributes.deposit_in_cents = ctx.input.depositInCents;
    if (ctx.input.description !== undefined) attributes.description = ctx.input.description;

    let response: any;
    if (ctx.input.paymentType === 'charge') {
      response = await client.createPaymentCharge(attributes);
    } else if (ctx.input.paymentType === 'authorization') {
      response = await client.createPaymentAuthorization(attributes);
    } else {
      response = await client.createPaymentRefund(attributes);
    }

    let payment = flattenSingleResource(response);

    return {
      output: { payment },
      message: `Created payment ${ctx.input.paymentType} for **${ctx.input.amountInCents / 100}** on order ${ctx.input.orderId}.`
    };
  })
  .build();
