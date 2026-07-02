import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let salesOrderImportedTrigger = SlateTrigger.create(spec, {
  name: 'Sales Order Imported',
  key: 'sales_order_imported',
  description:
    'Fires when sales orders are imported from a connected order source. Includes order details such as customer info, items, pricing, and shipping addresses.'
})
  .input(
    z.object({
      resourceUrl: z.string().optional().describe('URL to the order resource'),
      salesOrderId: z.string().optional().describe('Sales order ID'),
      orderNumber: z.string().optional().describe('Order number'),
      orderSource: z.string().optional().describe('Order source name'),
      status: z.string().optional().describe('Order status'),
      rawPayload: z.any().optional().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      salesOrderId: z.string().describe('Sales order ID'),
      orderNumber: z.string().optional().describe('Order number'),
      orderSource: z
        .string()
        .optional()
        .describe('Source of the order (e.g., marketplace name)'),
      status: z.string().optional().describe('Order status'),
      resourceUrl: z
        .string()
        .optional()
        .describe('URL to the order resource for fetching full details')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let webhook = await client.createWebhook({
        event: 'sales_orders_imported',
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          webhookId: webhook.webhook_id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let orderData = data?.data ?? data ?? {};

      return {
        inputs: [
          {
            resourceUrl: data?.resource_url ?? '',
            salesOrderId: orderData.sales_order_id ?? orderData.order_id ?? '',
            orderNumber: orderData.order_number,
            orderSource: orderData.order_source?.name ?? orderData.order_source,
            status: orderData.order_status ?? orderData.status,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'sales_order.imported',
        id: `sales-order-${ctx.input.salesOrderId ?? ''}-${Date.now()}`,
        output: {
          salesOrderId: ctx.input.salesOrderId ?? '',
          orderNumber: ctx.input.orderNumber,
          orderSource: ctx.input.orderSource,
          status: ctx.input.status,
          resourceUrl: ctx.input.resourceUrl
        }
      };
    }
  })
  .build();
