import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';

export let deletePaymentLink = SlateTool.create(spec, {
  name: 'Delete Payment Link',
  key: 'delete_payment_link',
  description:
    'Delete a payment link and cancel its unpaid checkout order. A buyer using the link can no longer complete checkout.',
  tags: { destructive: true }
})
  .scopes(allOf('ORDERS_READ', 'ORDERS_WRITE'))
  .input(z.object({ paymentLinkId: z.string().min(1) }))
  .output(z.object({ paymentLinkId: z.string(), cancelledOrderId: z.string().optional() }))
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['ORDERS_READ', 'ORDERS_WRITE']);
    let response = await createClient(ctx.auth).request<{
      id: string;
      cancelled_order_id?: string;
    }>(
      'DELETE',
      `/online-checkout/payment-links/${encodeURIComponent(ctx.input.paymentLinkId)}`
    );
    return {
      output: { paymentLinkId: response.id, cancelledOrderId: response.cancelled_order_id },
      message: `Payment link **${response.id}** deleted${response.cancelled_order_id ? `; checkout order **${response.cancelled_order_id}** canceled` : ''}.`
    };
  })
  .build();
