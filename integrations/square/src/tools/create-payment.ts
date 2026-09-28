import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient, generateIdempotencyKey, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';
import { mapPayment, moneyInputSchema, paymentOutputSchema } from './payment-shared';

export let createPayment = SlateTool.create(spec, {
  name: 'Create Payment',
  key: 'create_payment',
  description:
    'Charge a token or saved card, or record cash or an external payment. Use autocomplete=false for delayed capture.',
  tags: { destructive: false }
})
  .scopes(allOf('PAYMENTS_WRITE'))
  .input(
    z.object({
      sourceId: z
        .string()
        .min(1)
        .describe(
          'Payment token or saved card ID; use CASH or EXTERNAL for recorded payments'
        ),
      amountMoney: moneyInputSchema
        .extend({ amount: z.number().int().safe().positive() })
        .describe('Payment amount in minor units'),
      tipMoney: moneyInputSchema.optional(),
      appFeeMoney: moneyInputSchema
        .optional()
        .describe('Application fee; requires PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS'),
      appFeeAllocations: z
        .array(z.record(z.string(), z.any()))
        .max(2)
        .optional()
        .describe(
          'Application fee allocations; requires PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS'
        ),
      customerId: z
        .string()
        .optional()
        .describe('Required when paying with a saved card; discover with list_cards'),
      locationId: z
        .string()
        .optional()
        .describe('Discover with list_locations; main location is used if omitted'),
      orderId: z.string().optional(),
      referenceId: z.string().max(40).optional(),
      note: z.string().max(500).optional(),
      autocomplete: z.boolean().optional(),
      delayDuration: z
        .string()
        .optional()
        .describe('RFC 3339 duration for delayed card capture; requires autocomplete=false'),
      delayAction: z
        .enum(['CANCEL', 'COMPLETE'])
        .optional()
        .describe('Action at the delayed-capture deadline; requires autocomplete=false'),
      verificationToken: z.string().optional(),
      acceptPartialAuthorization: z
        .boolean()
        .optional()
        .describe('For Square gift cards; requires autocomplete=false'),
      buyerEmailAddress: z.string().optional(),
      buyerPhoneNumber: z.string().optional(),
      billingAddress: z.record(z.string(), z.any()).optional(),
      shippingAddress: z.record(z.string(), z.any()).optional(),
      statementDescriptionIdentifier: z.string().max(20).optional(),
      cashDetails: z
        .object({
          buyerSuppliedMoney: moneyInputSchema
        })
        .optional()
        .describe('Required with sourceId=CASH; Square calculates change'),
      externalDetails: z
        .object({
          type: z.enum([
            'CHECK',
            'BANK_TRANSFER',
            'OTHER_GIFT_CARD',
            'CRYPTO',
            'SQUARE_CASH',
            'SOCIAL',
            'EXTERNAL',
            'EMONEY',
            'CARD',
            'STORED_BALANCE',
            'FOOD_VOUCHER',
            'OTHER'
          ]),
          source: z.string().max(255),
          sourceId: z.string().max(255).optional(),
          sourceFeeMoney: moneyInputSchema.optional()
        })
        .optional()
        .describe('External payment details; required with sourceId=EXTERNAL'),
      customerDetails: z.record(z.string(), z.any()).optional(),
      idempotencyKey: z
        .string()
        .min(1)
        .max(45)
        .optional()
        .describe(
          'Unique retry key. Auto-generated if omitted; supply one when retrying after an uncertain result'
        )
    })
  )
  .output(paymentOutputSchema)
  .handleInvocation(async ctx => {
    let input = ctx.input;
    if (
      (input.delayDuration || input.delayAction || input.acceptPartialAuthorization) &&
      input.autocomplete !== false
    ) {
      throw squareServiceError(
        'Delayed capture or partial authorization requires autocomplete=false.'
      );
    }
    if (
      (input.sourceId === 'CASH' && input.externalDetails) ||
      (input.sourceId !== 'CASH' && input.cashDetails)
    ) {
      throw squareServiceError('cashDetails can only be used with sourceId=CASH.');
    }
    if (input.sourceId === 'CASH' && !input.cashDetails) {
      throw squareServiceError(
        'cashDetails.buyerSuppliedMoney is required with sourceId=CASH.'
      );
    }
    if (
      (input.sourceId === 'EXTERNAL' && !input.externalDetails) ||
      (input.sourceId !== 'EXTERNAL' && input.externalDetails)
    ) {
      throw squareServiceError('externalDetails is required only with sourceId=EXTERNAL.');
    }
    if (input.appFeeMoney || input.appFeeAllocations) {
      requireSquareScopes(ctx.auth, ['PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS']);
    }
    let p = await createClient(ctx.auth).createPayment({
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey || generateIdempotencyKey(),
      amountMoney: input.amountMoney,
      tipMoney: input.tipMoney,
      appFeeMoney: input.appFeeMoney,
      appFeeAllocations: input.appFeeAllocations,
      customerId: input.customerId,
      locationId: input.locationId,
      orderId: input.orderId,
      referenceId: input.referenceId,
      note: input.note,
      autocomplete: input.autocomplete,
      delayDuration: input.delayDuration,
      delayAction: input.delayAction,
      verificationToken: input.verificationToken,
      acceptPartialAuthorization: input.acceptPartialAuthorization,
      buyerEmailAddress: input.buyerEmailAddress,
      buyerPhoneNumber: input.buyerPhoneNumber,
      billingAddress: input.billingAddress,
      shippingAddress: input.shippingAddress,
      statementDescriptionIdentifier: input.statementDescriptionIdentifier,
      cashDetails: input.cashDetails && {
        buyer_supplied_money: input.cashDetails.buyerSuppliedMoney
      },
      externalDetails: input.externalDetails && {
        type: input.externalDetails.type,
        source: input.externalDetails.source,
        source_id: input.externalDetails.sourceId,
        source_fee_money: input.externalDetails.sourceFeeMoney
      },
      customerDetails: input.customerDetails
    });
    return {
      output: mapPayment(p),
      message: `Payment **${p.id}** created with status **${p.status}**.`
    };
  })
  .build();
