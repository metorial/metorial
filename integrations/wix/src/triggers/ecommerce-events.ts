import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let ecommerceEvents = SlateTrigger.create(spec, {
  name: 'eCommerce Events',
  key: 'ecommerce_events',
  description:
    'Triggers on eCommerce events including cart changes, checkout completion, and order lifecycle events (created, updated, approved, canceled, fulfilled).'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of eCommerce event'),
      eventId: z.string().describe('Unique event identifier'),
      resourceId: z.string().describe('ID of the affected resource (order, cart, checkout)'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      orderId: z.string().optional().describe('Order ID if applicable'),
      cartId: z.string().optional().describe('Cart ID if applicable'),
      checkoutId: z.string().optional().describe('Checkout ID if applicable'),
      status: z.string().optional().describe('Current status of the resource'),
      buyerEmail: z.string().optional().describe('Buyer email address'),
      totalPrice: z.string().optional().describe('Total order price'),
      currency: z.string().optional().describe('Currency code'),
      lineItems: z.array(z.any()).optional().describe('Order line items'),
      createdDate: z.string().optional().describe('When the resource was created'),
      updatedDate: z.string().optional().describe('When the resource was last updated'),
      rawPayload: z.any().optional().describe('Complete raw event data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let eventType = data.eventType || data.type || 'unknown';
      let eventId = data.eventId || `${data.instanceId}-${Date.now()}`;

      let resourceId = '';
      let payload = data.data || data;

      if (payload.order) {
        resourceId = payload.order.id || payload.orderId || '';
      } else if (payload.cart) {
        resourceId = payload.cart.id || payload.cartId || '';
      } else if (payload.checkout) {
        resourceId = payload.checkout.id || payload.checkoutId || '';
      } else {
        resourceId = payload.orderId || payload.cartId || payload.checkoutId || eventId;
      }

      return {
        inputs: [
          {
            eventType,
            eventId,
            resourceId,
            payload
          }
        ]
      };
    },
    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      let order = payload.order || payload;
      let cart = payload.cart;
      let checkout = payload.checkout;

      let type = ctx.input.eventType.toLowerCase().replace(/\//g, '.').replace(/\s+/g, '_');
      if (!type.includes('.')) {
        type = `ecommerce.${type}`;
      }

      return {
        type,
        id: ctx.input.eventId,
        output: {
          orderId: order?.id || payload.orderId,
          cartId: cart?.id || payload.cartId,
          checkoutId: checkout?.id || payload.checkoutId,
          status: order?.status || order?.paymentStatus,
          buyerEmail: order?.buyerInfo?.email || order?.billingInfo?.contactDetails?.email,
          totalPrice: order?.priceSummary?.totalPrice?.amount,
          currency: order?.currency,
          lineItems: order?.lineItems,
          createdDate: order?.createdDate || order?._createdDate,
          updatedDate: order?.updatedDate || order?._updatedDate,
          rawPayload: payload
        }
      };
    }
  })
  .build();
