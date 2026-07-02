import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';

let SALE_RESOURCE_NAMES = ['sale', 'refund', 'dispute', 'dispute_won'] as const;

export let saleEvents = SlateTrigger.create(spec, {
  name: 'Sale Events',
  key: 'sale_events',
  description:
    'Triggers when a sale occurs, is refunded, or a dispute is opened or won on your Gumroad account.'
})
  .input(
    z.object({
      resourceName: z.string().describe('The resource/event type that triggered this event'),
      saleId: z.string().describe('Unique sale/purchase ID'),
      saleTimestamp: z.string().optional().describe('Timestamp of the sale'),
      payload: z.record(z.string(), z.any()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      saleId: z.string().describe('Unique sale/purchase ID'),
      email: z.string().optional().describe('Buyer email address'),
      productId: z.string().optional().describe('Product ID'),
      productName: z.string().optional().describe('Product name'),
      productPermalink: z.string().optional().describe('Product permalink'),
      priceCents: z.number().optional().describe('Sale price in cents'),
      currency: z.string().optional().describe('Currency code'),
      quantity: z.number().optional().describe('Quantity purchased'),
      orderNumber: z.string().optional().describe('Order number'),
      refunded: z.boolean().optional().describe('Whether the sale was refunded'),
      disputed: z.boolean().optional().describe('Whether the sale is disputed'),
      disputeWon: z.boolean().optional().describe('Whether the dispute was won'),
      licenseKey: z.string().optional().describe('License key if applicable'),
      variants: z.any().optional().describe('Selected variant options'),
      customFields: z.any().optional().describe('Custom field values'),
      urlParams: z.any().optional().describe('URL parameters from the sale')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GumroadClient({ token: ctx.auth.token });

      let registrations: Array<{ resourceSubscriptionId: string; resourceName: string }> = [];
      for (let resourceName of SALE_RESOURCE_NAMES) {
        let sub = await client.createResourceSubscription(
          resourceName,
          ctx.input.webhookBaseUrl
        );
        registrations.push({
          resourceSubscriptionId: sub.id,
          resourceName
        });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new GumroadClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registrations: Array<{ resourceSubscriptionId: string; resourceName: string }>;
      };

      for (let reg of details.registrations) {
        try {
          await client.deleteResourceSubscription(reg.resourceSubscriptionId);
        } catch (_e) {
          // Subscription may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data: Record<string, any> = {};
      try {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        data = Object.fromEntries(params.entries());
      } catch (_e) {
        let json = (await ctx.request.json()) as Record<string, any>;
        data = json;
      }

      let resourceName = String(data.resource_name || 'sale');
      let saleId = String(
        data.sale_id || data.purchase_id || data.id || `unknown_${Date.now()}`
      );

      return {
        inputs: [
          {
            resourceName,
            saleId,
            saleTimestamp: String(
              data.sale_timestamp || data.created_at || new Date().toISOString()
            ),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { resourceName, saleId, payload } = ctx.input;

      let priceCents: number | undefined;
      if (payload.price !== undefined) {
        let parsed =
          typeof payload.price === 'number'
            ? payload.price
            : Number.parseInt(String(payload.price), 10);
        priceCents = Number.isNaN(parsed) ? undefined : parsed;
      }

      let quantity: number | undefined;
      if (payload.quantity !== undefined) {
        let parsed =
          typeof payload.quantity === 'number'
            ? payload.quantity
            : Number.parseInt(String(payload.quantity), 10);
        quantity = Number.isNaN(parsed) ? undefined : parsed;
      }

      let variants: any;
      if (payload.variants) {
        try {
          variants =
            typeof payload.variants === 'string'
              ? JSON.parse(payload.variants)
              : payload.variants;
        } catch (_e) {
          variants = payload.variants;
        }
      }

      let customFields: any;
      if (payload.custom_fields) {
        try {
          customFields =
            typeof payload.custom_fields === 'string'
              ? JSON.parse(payload.custom_fields)
              : payload.custom_fields;
        } catch (_e) {
          customFields = payload.custom_fields;
        }
      }

      let urlParams: any;
      if (payload.url_params) {
        try {
          urlParams =
            typeof payload.url_params === 'string'
              ? JSON.parse(payload.url_params)
              : payload.url_params;
        } catch (_e) {
          urlParams = payload.url_params;
        }
      }

      let email = payload.email ? String(payload.email) : undefined;
      let productId = payload.product_id ? String(payload.product_id) : undefined;
      let productName = payload.product_name ? String(payload.product_name) : undefined;
      let productPermalink = payload.product_permalink
        ? String(payload.product_permalink)
        : undefined;
      let currency = payload.currency ? String(payload.currency) : undefined;
      let orderNumber = payload.order_number ? String(payload.order_number) : undefined;
      let licenseKey = payload.license_key ? String(payload.license_key) : undefined;

      let refunded =
        resourceName === 'refund'
          ? true
          : payload.refunded === true || payload.refunded === 'true'
            ? true
            : undefined;
      let disputed =
        resourceName === 'dispute'
          ? true
          : payload.disputed === true || payload.disputed === 'true'
            ? true
            : undefined;
      let disputeWon = resourceName === 'dispute_won' ? true : undefined;

      return {
        type: `sale.${resourceName}`,
        id: `${resourceName}_${saleId}`,
        output: {
          saleId,
          email,
          productId,
          productName,
          productPermalink,
          priceCents,
          currency,
          quantity,
          orderNumber,
          refunded,
          disputed,
          disputeWon,
          licenseKey,
          variants,
          customFields,
          urlParams
        }
      };
    }
  })
  .build();
