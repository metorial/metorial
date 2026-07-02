import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let addressSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  company: z.string(),
  address1: z.string(),
  address2: z.string(),
  city: z.string(),
  state: z.string(),
  postcode: z.string(),
  country: z.string(),
  email: z.string().optional(),
  phone: z.string().optional()
});

let lineItemSchema = z.object({
  lineItemId: z.number(),
  name: z.string(),
  productId: z.number(),
  variationId: z.number(),
  quantity: z.number(),
  subtotal: z.string(),
  total: z.string(),
  sku: z.string()
});

export let orderEvents = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description: 'Triggers when an order is created, updated, deleted, or restored in the store.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of order event'),
      webhookId: z.number().describe('WooCommerce webhook ID that sent this event'),
      order: z.any().describe('Raw order data from WooCommerce')
    })
  )
  .output(
    z.object({
      orderId: z.number(),
      orderNumber: z.string(),
      status: z.string(),
      currency: z.string(),
      total: z.string(),
      subtotal: z.string(),
      totalTax: z.string(),
      shippingTotal: z.string(),
      discountTotal: z.string(),
      customerId: z.number(),
      customerNote: z.string(),
      billing: addressSchema,
      shipping: addressSchema,
      paymentMethod: z.string(),
      paymentMethodTitle: z.string(),
      lineItems: z.array(lineItemSchema),
      dateCreated: z.string(),
      dateModified: z.string()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let topics = ['order.created', 'order.updated', 'order.deleted', 'order.restored'];
      let registeredWebhooks: Array<{ webhookId: number; topic: string }> = [];

      for (let topic of topics) {
        let webhook = await client.createWebhook({
          name: `Slates - ${topic}`,
          topic,
          delivery_url: ctx.input.webhookBaseUrl,
          status: 'active'
        });
        registeredWebhooks.push({ webhookId: webhook.id, topic });
      }

      return {
        registrationDetails: { webhooks: registeredWebhooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhooks = ctx.input.registrationDetails?.webhooks || [];

      for (let wh of webhooks) {
        try {
          await client.deleteWebhook(wh.webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let topic = ctx.request.headers.get('x-wc-webhook-topic') || '';
      let webhookId = Number.parseInt(ctx.request.headers.get('x-wc-webhook-id') || '0', 10);

      if (!body?.id) {
        return { inputs: [] };
      }

      let eventType = topic || 'order.updated';

      return {
        inputs: [
          {
            eventType,
            webhookId,
            order: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let o = ctx.input.order;

      let mapAddress = (a: any) => ({
        firstName: a?.first_name || '',
        lastName: a?.last_name || '',
        company: a?.company || '',
        address1: a?.address_1 || '',
        address2: a?.address_2 || '',
        city: a?.city || '',
        state: a?.state || '',
        postcode: a?.postcode || '',
        country: a?.country || '',
        email: a?.email || undefined,
        phone: a?.phone || undefined
      });

      return {
        type: ctx.input.eventType,
        id: `order-${o.id}-${ctx.input.eventType}-${o.date_modified || Date.now()}`,
        output: {
          orderId: o.id,
          orderNumber: o.number || String(o.id),
          status: o.status || '',
          currency: o.currency || '',
          total: o.total || '0',
          subtotal: o.subtotal || '0',
          totalTax: o.total_tax || '0',
          shippingTotal: o.shipping_total || '0',
          discountTotal: o.discount_total || '0',
          customerId: o.customer_id || 0,
          customerNote: o.customer_note || '',
          billing: mapAddress(o.billing),
          shipping: mapAddress(o.shipping),
          paymentMethod: o.payment_method || '',
          paymentMethodTitle: o.payment_method_title || '',
          lineItems: (o.line_items || []).map((li: any) => ({
            lineItemId: li.id,
            name: li.name || '',
            productId: li.product_id || 0,
            variationId: li.variation_id || 0,
            quantity: li.quantity || 0,
            subtotal: li.subtotal || '0',
            total: li.total || '0',
            sku: li.sku || ''
          })),
          dateCreated: o.date_created || '',
          dateModified: o.date_modified || ''
        }
      };
    }
  })
  .build();
