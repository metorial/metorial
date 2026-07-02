import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ALL_LICENSE_KEY_EVENTS = ['license_key_created', 'license_key_updated'];

export let licenseKeyEventsTrigger = SlateTrigger.create(spec, {
  name: 'License Key Events',
  key: 'license_key_events',
  description:
    'Triggers when a license key is created or updated. Useful for provisioning access or syncing license status with your application.'
})
  .input(
    z.object({
      eventName: z.string().describe('The webhook event name'),
      licenseKeyId: z.string().describe('The license key resource ID'),
      storeId: z.number(),
      customerId: z.number(),
      orderId: z.number(),
      productId: z.number(),
      orderItemId: z.number(),
      key: z.string(),
      keyShort: z.string(),
      status: z.string(),
      statusFormatted: z.string(),
      activationLimit: z.number(),
      activationUsage: z.number(),
      disabled: z.boolean(),
      expiresAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      customData: z.record(z.string(), z.unknown()).nullable().optional()
    })
  )
  .output(
    z.object({
      licenseKeyId: z.string(),
      storeId: z.number(),
      customerId: z.number(),
      orderId: z.number(),
      productId: z.number(),
      orderItemId: z.number(),
      key: z.string(),
      keyShort: z.string(),
      status: z.string(),
      statusFormatted: z.string(),
      activationLimit: z.number(),
      activationUsage: z.number(),
      disabled: z.boolean(),
      expiresAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      customData: z.record(z.string(), z.unknown()).nullable().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let storeId = ctx.config.storeId;

      if (!storeId) {
        let storesResponse = await client.listStores({ perPage: 1 });
        storeId = storesResponse.data?.[0]?.id;
        if (!storeId) throw new Error('No store found. Please configure a store ID.');
      }

      let secret = generateSecret();

      let response = await client.createWebhook(
        storeId,
        ctx.input.webhookBaseUrl,
        ALL_LICENSE_KEY_EVENTS,
        secret
      );

      return {
        registrationDetails: {
          webhookId: response.data.id,
          secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.meta?.event_name;
      let data = body.data;

      if (!data || !ALL_LICENSE_KEY_EVENTS.includes(eventName)) {
        return { inputs: [] };
      }

      let attrs = data.attributes;

      return {
        inputs: [
          {
            eventName,
            licenseKeyId: data.id,
            storeId: attrs.store_id,
            customerId: attrs.customer_id,
            orderId: attrs.order_id,
            productId: attrs.product_id,
            orderItemId: attrs.order_item_id,
            key: attrs.key,
            keyShort: attrs.key_short,
            status: attrs.status,
            statusFormatted: attrs.status_formatted,
            activationLimit: attrs.activation_limit,
            activationUsage: attrs.activation_usage,
            disabled: attrs.disabled,
            expiresAt: attrs.expires_at,
            createdAt: attrs.created_at,
            updatedAt: attrs.updated_at,
            customData: body.meta?.custom_data || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventName, licenseKeyId, ...rest } = ctx.input;

      return {
        type: eventName,
        id: `${eventName}_${licenseKeyId}_${rest.updatedAt}`,
        output: {
          licenseKeyId,
          ...rest
        }
      };
    }
  })
  .build();

let generateSecret = (): string => {
  let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
