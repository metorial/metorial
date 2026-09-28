import { allOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';
import {
  checkoutOptionsInput,
  checkoutOrderInput,
  mapCheckoutOptions,
  mapPaymentLink,
  mapPrePopulatedData,
  paymentLinkOutputSchema,
  prePopulatedDataInput,
  quickPayInput,
  type SquarePaymentLink,
  validateCheckoutOptions
} from './checkout-shared';

export let createPaymentLink = SlateTool.create(spec, {
  name: 'Create Payment Link',
  key: 'create_payment_link',
  description:
    'Create a single-use Square-hosted checkout link for a quick-pay item or a new itemized order. Call list_locations for a valid location ID.',
  tags: { destructive: false }
})
  .scopes(allOf('ORDERS_READ', 'ORDERS_WRITE', 'PAYMENTS_WRITE'))
  .input(
    z.object({
      checkoutMode: z.enum(['quickPay', 'order']).describe('Choose one checkout payload'),
      quickPay: quickPayInput
        .optional()
        .describe('Required only when checkoutMode is quickPay'),
      order: checkoutOrderInput
        .optional()
        .describe('Required only when checkoutMode is order'),
      checkoutOptions: checkoutOptionsInput.optional(),
      prePopulatedData: prePopulatedDataInput.optional(),
      description: z.string().max(4096).optional(),
      paymentNote: z.string().max(500).optional(),
      idempotencyKey: z
        .string()
        .min(1)
        .max(192)
        .optional()
        .describe(
          'Use the same key when retrying this exact checkout request; generated if omitted'
        )
    })
  )
  .output(paymentLinkOutputSchema)
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['ORDERS_READ', 'ORDERS_WRITE', 'PAYMENTS_WRITE']);
    let { checkoutMode, quickPay, order } = ctx.input;
    if (checkoutMode === 'quickPay' && (!quickPay || order)) {
      throw createApiServiceError('For quickPay checkout, provide quickPay and omit order.');
    }
    if (checkoutMode === 'order' && (!order || quickPay)) {
      throw createApiServiceError('For order checkout, provide order and omit quickPay.');
    }
    if (order) {
      for (let [index, item] of order.lineItems.entries()) {
        if (!item.name && !item.catalogObjectId) {
          throw createApiServiceError(
            `Order line item ${index + 1} needs name or catalogObjectId.`
          );
        }
        if (!item.catalogObjectId && !item.basePriceMoney) {
          throw createApiServiceError(
            `Order line item ${index + 1} needs basePriceMoney when catalogObjectId is omitted.`
          );
        }
        if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(item.quantity) || Number(item.quantity) <= 0) {
          throw createApiServiceError(
            `Order line item ${index + 1} needs a positive decimal quantity.`
          );
        }
      }
    }
    validateCheckoutOptions(ctx.auth, ctx.input.checkoutOptions, quickPay?.priceMoney);

    let response = await createClient(ctx.auth).request<{
      payment_link: SquarePaymentLink;
    }>('POST', '/online-checkout/payment-links', {
      body: {
        idempotency_key: ctx.input.idempotencyKey ?? generateIdempotencyKey(),
        description: ctx.input.description,
        payment_note: ctx.input.paymentNote,
        quick_pay: quickPay
          ? {
              name: quickPay.name,
              price_money: quickPay.priceMoney,
              location_id: quickPay.locationId
            }
          : undefined,
        order: order
          ? {
              location_id: order.locationId,
              customer_id: order.customerId,
              reference_id: order.referenceId,
              line_items: order.lineItems.map(item => ({
                name: item.name,
                catalog_object_id: item.catalogObjectId,
                quantity: item.quantity,
                base_price_money: item.basePriceMoney,
                note: item.note
              })),
              pricing_options:
                order.autoApplyTaxes === undefined
                  ? undefined
                  : { auto_apply_taxes: order.autoApplyTaxes }
            }
          : undefined,
        checkout_options: ctx.input.checkoutOptions
          ? mapCheckoutOptions(ctx.input.checkoutOptions)
          : undefined,
        pre_populated_data: ctx.input.prePopulatedData
          ? mapPrePopulatedData(ctx.input.prePopulatedData)
          : undefined
      }
    });
    let link = response.payment_link;
    return {
      output: mapPaymentLink(link),
      message: `Payment link **${link.id}** created. Checkout URL: ${link.url ?? link.long_url ?? 'unavailable'}`
    };
  })
  .build();
