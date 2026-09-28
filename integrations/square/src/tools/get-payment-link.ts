import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';
import {
  mapPaymentLink,
  paymentLinkOutputSchema,
  type SquarePaymentLink
} from './checkout-shared';

export let getPaymentLink = SlateTool.create(spec, {
  name: 'Get Payment Link',
  key: 'get_payment_link',
  description:
    'Retrieve a Square-hosted payment link, its order ID, version, and checkout URL.',
  tags: { readOnly: true }
})
  .scopes(allOf('ORDERS_READ'))
  .input(z.object({ paymentLinkId: z.string().min(1) }))
  .output(paymentLinkOutputSchema)
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['ORDERS_READ']);
    let response = await createClient(ctx.auth).request<{ payment_link: SquarePaymentLink }>(
      'GET',
      `/online-checkout/payment-links/${encodeURIComponent(ctx.input.paymentLinkId)}`
    );
    let link = response.payment_link;
    return {
      output: mapPaymentLink(link),
      message: `Payment link **${link.id}** points to order **${link.order_id ?? 'unknown'}**.`
    };
  })
  .build();
