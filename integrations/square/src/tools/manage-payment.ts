import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';
import { mapPayment, moneyInputSchema, paymentOutputSchema } from './payment-shared';

export let managePayment = SlateTool.create(spec, {
  name: 'Manage Payment',
  key: 'manage_payment',
  description:
    'Capture or void an approved payment, update its amount or tip, or void an uncertain create request using its idempotency key.'
})
  .scopes(allOf('PAYMENTS_WRITE'))
  .input(
    z.object({
      action: z.enum(['complete', 'cancel', 'update', 'cancel_by_idempotency_key']),
      paymentId: z
        .string()
        .optional()
        .describe('Required except for cancel_by_idempotency_key'),
      versionToken: z
        .string()
        .optional()
        .describe(
          'Current payment version token from get_payment; supported for complete and update'
        ),
      amountMoney: moneyInputSchema
        .optional()
        .describe('New amount for update of an APPROVED payment'),
      tipMoney: moneyInputSchema
        .optional()
        .describe('New tip for update of an APPROVED payment'),
      idempotencyKey: z
        .string()
        .min(1)
        .max(45)
        .optional()
        .describe(
          'For cancel_by_idempotency_key, use the original create key. For update, use a unique retry key; generated if omitted'
        )
    })
  )
  .output(z.object({ success: z.boolean(), payment: paymentOutputSchema.optional() }))
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let client = createClient(ctx.auth);
    if (input.action === 'cancel_by_idempotency_key') {
      if (
        !input.idempotencyKey ||
        input.paymentId ||
        input.amountMoney ||
        input.tipMoney ||
        input.versionToken
      ) {
        throw squareServiceError(
          'cancel_by_idempotency_key requires only the original idempotencyKey, without paymentId or update fields.'
        );
      }
      await client.cancelPaymentByIdempotencyKey(input.idempotencyKey);
      return {
        output: { success: true },
        message:
          'Cancellation request completed. Square also succeeds when no matching payment exists.'
      };
    }
    if (!input.paymentId)
      throw squareServiceError('paymentId is required for complete, cancel, or update.');
    if (
      input.action !== 'update' &&
      (input.amountMoney || input.tipMoney || input.idempotencyKey)
    ) {
      throw squareServiceError(
        'amountMoney, tipMoney, and idempotencyKey are only valid for update.'
      );
    }
    if (input.action === 'cancel' && input.versionToken) {
      throw squareServiceError(
        'versionToken is supported for complete and update, not cancel.'
      );
    }
    if (input.action === 'update' && !input.amountMoney && !input.tipMoney) {
      throw squareServiceError(
        'Provide amountMoney or tipMoney to update an approved payment.'
      );
    }
    let payment =
      input.action === 'complete'
        ? await client.completePayment(input.paymentId, input.versionToken)
        : input.action === 'cancel'
          ? await client.cancelPayment(input.paymentId)
          : await client.updatePayment(input.paymentId, {
              idempotencyKey: input.idempotencyKey || generateIdempotencyKey(),
              amountMoney: input.amountMoney,
              tipMoney: input.tipMoney,
              versionToken: input.versionToken
            });
    let pastTense = { complete: 'completed', cancel: 'canceled', update: 'updated' }[
      input.action
    ];
    return {
      output: { success: true, payment: mapPayment(payment) },
      message: `Payment **${payment.id}** ${pastTense}. Status: **${payment.status}**`
    };
  })
  .build();
