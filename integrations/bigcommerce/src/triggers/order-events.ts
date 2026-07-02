import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let orderEvents = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description:
    'Triggers when orders are created, updated, archived, or when order status changes. Fetches the full order details for each event.'
})
  .input(
    z.object({
      scope: z.string().describe('The webhook scope (e.g., store/order/created)'),
      orderId: z.number().describe('The order ID from the webhook payload'),
      webhookEventHash: z.string().describe('Unique hash for the webhook event')
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('The order ID'),
      status: z.string().optional().describe('Current order status'),
      statusId: z.number().optional().describe('Current order status ID'),
      total: z.string().optional().describe('Order total including tax'),
      customerEmail: z.string().optional().describe('Customer email address'),
      customerId: z.number().optional().describe('Customer ID'),
      dateCreated: z.string().optional().describe('Date the order was created'),
      dateModified: z.string().optional().describe('Date the order was last modified'),
      currencyCode: z.string().optional().describe('Order currency code'),
      paymentMethod: z.string().optional().describe('Payment method used'),
      orderDetails: z.any().optional().describe('Full order object from the API')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        storeHash: ctx.config.storeHash
      });

      let scopes = [
        'store/order/created',
        'store/order/updated',
        'store/order/archived',
        'store/order/statusUpdated',
        'store/order/message/created',
        'store/order/refund/created'
      ];

      let webhookIds: number[] = [];
      for (let scope of scopes) {
        let result = await client.createWebhook({
          scope,
          destination: ctx.input.webhookBaseUrl,
          is_active: true
        });
        webhookIds.push(result.data.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        storeHash: ctx.config.storeHash
      });

      let { webhookIds } = ctx.input.registrationDetails as { webhookIds: number[] };
      for (let webhookId of webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let scope = body.scope as string;
      let orderId = body.data?.id as number;
      let hash = (body.hash as string) || `${scope}-${orderId}-${Date.now()}`;

      return {
        inputs: [
          {
            scope,
            orderId,
            webhookEventHash: hash
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        storeHash: ctx.config.storeHash
      });

      let scopeParts = ctx.input.scope.replace('store/order/', '');
      let eventType = `order.${scopeParts.replace('/', '_')}`;

      let orderDetails: any = null;
      try {
        orderDetails = await client.getOrder(ctx.input.orderId);
      } catch {
        // Order may have been deleted
      }

      return {
        type: eventType,
        id: ctx.input.webhookEventHash,
        output: {
          orderId: ctx.input.orderId,
          status: orderDetails?.status,
          statusId: orderDetails?.status_id,
          total: orderDetails?.total_inc_tax,
          customerEmail: orderDetails?.billing_address?.email,
          customerId: orderDetails?.customer_id,
          dateCreated: orderDetails?.date_created,
          dateModified: orderDetails?.date_modified,
          currencyCode: orderDetails?.currency_code,
          paymentMethod: orderDetails?.payment_method,
          orderDetails
        }
      };
    }
  })
  .build();
