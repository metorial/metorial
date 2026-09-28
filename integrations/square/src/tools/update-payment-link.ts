import { allOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';
import {
  checkoutOptionsInput,
  mapCheckoutOptions,
  mapPaymentLink,
  mapPrePopulatedData,
  paymentLinkOutputSchema,
  prePopulatedDataInput,
  type SquarePaymentLink,
  validateCheckoutOptions
} from './checkout-shared';

export let updatePaymentLink = SlateTool.create(spec, {
  name: 'Update Payment Link',
  key: 'update_payment_link',
  description:
    'Update a payment link using its current version. Checkout options replace the full options object; provide every option you want to keep.',
  tags: { destructive: false }
})
  .scopes(allOf('ORDERS_READ', 'ORDERS_WRITE', 'PAYMENTS_WRITE'))
  .input(
    z.object({
      paymentLinkId: z.string().min(1),
      version: z
        .number()
        .int()
        .min(1)
        .max(65535)
        .describe('Current version from get_payment_link'),
      description: z.string().max(4096).optional(),
      checkoutOptions: checkoutOptionsInput
        .optional()
        .describe('Full replacement; omitted checkout option fields are removed'),
      prePopulatedData: prePopulatedDataInput
        .optional()
        .describe('Only supplied buyer fields are updated')
    })
  )
  .output(paymentLinkOutputSchema)
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['ORDERS_READ', 'ORDERS_WRITE', 'PAYMENTS_WRITE']);
    if (
      ctx.input.description === undefined &&
      !ctx.input.checkoutOptions &&
      !ctx.input.prePopulatedData
    ) {
      throw createApiServiceError(
        'Provide description, checkoutOptions, or prePopulatedData to update.'
      );
    }
    validateCheckoutOptions(ctx.auth, ctx.input.checkoutOptions);
    let response = await createClient(ctx.auth).request<{ payment_link: SquarePaymentLink }>(
      'PUT',
      `/online-checkout/payment-links/${encodeURIComponent(ctx.input.paymentLinkId)}`,
      {
        body: {
          payment_link: {
            version: ctx.input.version,
            description: ctx.input.description,
            checkout_options: ctx.input.checkoutOptions
              ? mapCheckoutOptions(ctx.input.checkoutOptions)
              : undefined,
            pre_populated_data: ctx.input.prePopulatedData
              ? mapPrePopulatedData(ctx.input.prePopulatedData)
              : undefined
          }
        }
      }
    );
    let link = response.payment_link;
    return {
      output: mapPaymentLink(link),
      message: `Payment link **${link.id}** updated to version **${link.version}**.`
    };
  })
  .build();
