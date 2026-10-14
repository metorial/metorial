import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

let moneySchema = z.object({
  amount: z.number().describe('Monetary amount'),
  currency: z.string().describe('ISO 4217 currency code')
});

export let manageFolio = SlateTool.create(spec, {
  name: 'Manage Folio',
  key: 'manage_folio',
  description: `Perform operations on a guest folio: **post a charge** (e.g., minibar, restaurant), **post a payment**, **post a refund**, or **close** the folio. Commonly used by POS systems to charge services to a guest's room.`,
  instructions: [
    'Use "post_charge" to add charges like restaurant bills, minibar, spa, etc.',
    'Use "post_payment" to record payments made by the guest.',
    'Use "close" to close a balanced folio (balance must be zero).'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      folioId: z.string().describe('Folio ID to operate on'),
      action: z
        .enum(['post_charge', 'post_payment', 'post_refund', 'close'])
        .describe('Action to perform'),
      name: z.string().optional().describe('Charge description/name (for post_charge)'),
      serviceType: z
        .string()
        .optional()
        .describe('Service type for the charge (e.g., FoodAndBeverages, Other)'),
      method: z
        .string()
        .optional()
        .describe(
          'Payment method (for post_payment/post_refund, e.g., Cash, CreditCard, BankTransfer)'
        ),
      amount: moneySchema
        .optional()
        .describe('Amount (required for post_charge, post_payment, post_refund)'),
      receipt: z.string().optional().describe('Receipt or reference number'),
      reason: z.string().optional().describe('Reason for refund (for post_refund)'),
      vatType: z
        .string()
        .optional()
        .describe('VAT type for charge (e.g., Null, Reduced, Normal)'),
      quantity: z.number().optional().describe('Quantity of items (for post_charge)')
    })
  )
  .output(
    z.object({
      folioId: z.string().describe('Folio ID'),
      action: z.string().describe('Action performed'),
      chargeId: z.string().optional().describe('ID of the posted charge.'),
      paymentId: z.string().optional().describe('ID of the posted payment.'),
      refundId: z.string().optional().describe('ID of the posted refund.'),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);
    let { folioId, action } = ctx.input;
    let resourceId: string | undefined;

    switch (action) {
      case 'post_charge': {
        if (!ctx.input.amount)
          throw createApiServiceError('amount is required for post_charge');
        if (!ctx.input.name) throw createApiServiceError('name is required for post_charge');
        if (!ctx.input.vatType)
          throw createApiServiceError(
            'vatType is required for post_charge. Choose the applicable VAT type, such as Normal, Reduced, Null, or Without.'
          );
        let charge = await client.postCharge(folioId, {
          serviceType: ctx.input.serviceType || 'Other',
          name: ctx.input.name,
          amount: ctx.input.amount,
          receipt: ctx.input.receipt,
          vatType: ctx.input.vatType,
          quantity: ctx.input.quantity ?? 1
        });
        resourceId = charge.id;
        break;
      }
      case 'post_payment': {
        if (!ctx.input.amount)
          throw createApiServiceError('amount is required for post_payment');
        if (!ctx.input.method)
          throw createApiServiceError('method is required for post_payment');
        let payment = await client.postPayment(folioId, {
          method: ctx.input.method,
          amount: ctx.input.amount,
          receipt: ctx.input.receipt
        });
        resourceId = payment.id;
        break;
      }
      case 'post_refund': {
        if (!ctx.input.amount)
          throw createApiServiceError('amount is required for post_refund');
        if (!ctx.input.method)
          throw createApiServiceError('method is required for post_refund');
        let refund = await client.postRefund(folioId, {
          method: ctx.input.method,
          amount: ctx.input.amount,
          receipt: ctx.input.receipt,
          reason: ctx.input.reason
        });
        resourceId = refund.id;
        break;
      }
      case 'close':
        await client.closeFolio(folioId);
        break;
    }

    let actionLabels: Record<string, string> = {
      post_charge: `posted charge of ${ctx.input.amount?.amount} ${ctx.input.amount?.currency}`,
      post_payment: `posted payment of ${ctx.input.amount?.amount} ${ctx.input.amount?.currency}`,
      post_refund: `posted refund of ${ctx.input.amount?.amount} ${ctx.input.amount?.currency}`,
      close: 'closed'
    };

    return {
      output: {
        folioId,
        action,
        chargeId: action === 'post_charge' ? resourceId : undefined,
        paymentId: action === 'post_payment' ? resourceId : undefined,
        refundId: action === 'post_refund' ? resourceId : undefined,
        success: true
      },
      message: `Folio **${folioId}** ${actionLabels[action]}.`
    };
  })
  .build();
