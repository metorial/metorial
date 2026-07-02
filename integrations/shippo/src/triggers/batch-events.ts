import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let batchEvents = SlateTrigger.create(spec, {
  name: 'Batch Events',
  key: 'batch_events',
  description:
    'Triggered when a batch label operation is created or purchased. Covers both batch_created and batch_purchased events.'
})
  .input(
    z.object({
      eventType: z.enum(['batch_created', 'batch_purchased']).describe('Type of batch event'),
      batchPayload: z.any().describe('Full batch object from Shippo')
    })
  )
  .output(
    z.object({
      batchId: z.string().optional(),
      status: z
        .string()
        .optional()
        .describe('Batch status: VALIDATING, VALID, INVALID, PURCHASING, PURCHASED'),
      defaultCarrierAccount: z.string().optional(),
      defaultServicelevelToken: z.string().optional(),
      labelFiletype: z.string().optional(),
      metadata: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      shipmentCount: z.number().optional(),
      labelUrl: z
        .string()
        .optional()
        .describe('URL for batch label download (available after purchase)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ShippoClient(ctx.auth.token);

      let createdWebhook = (await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/created`,
        event: 'batch_created',
        is_test: false
      })) as Record<string, any>;

      let purchasedWebhook = (await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/purchased`,
        event: 'batch_purchased',
        is_test: false
      })) as Record<string, any>;

      return {
        registrationDetails: {
          createdWebhookId: createdWebhook.object_id,
          purchasedWebhookId: purchasedWebhook.object_id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ShippoClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as {
        createdWebhookId: string;
        purchasedWebhookId: string;
      };
      await client.deleteWebhook(details.createdWebhookId);
      await client.deleteWebhook(details.purchasedWebhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let url = new URL(ctx.request.url);
      let pathSegment = url.pathname.split('/').pop();

      let eventType: 'batch_created' | 'batch_purchased' =
        pathSegment === 'created' ? 'batch_created' : 'batch_purchased';

      return {
        inputs: [
          {
            eventType,
            batchPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.batchPayload as Record<string, any>;

      return {
        type: `batch.${ctx.input.eventType === 'batch_created' ? 'created' : 'purchased'}`,
        id: `${payload.object_id}-${ctx.input.eventType}-${payload.object_updated || Date.now()}`,
        output: {
          batchId: payload.object_id,
          status: payload.status,
          defaultCarrierAccount: payload.default_carrier_account,
          defaultServicelevelToken: payload.default_servicelevel_token,
          labelFiletype: payload.label_filetype,
          metadata: payload.metadata,
          createdAt: payload.object_created,
          updatedAt: payload.object_updated,
          shipmentCount: payload.batch_shipments?.count,
          labelUrl: payload.label_url
        }
      };
    }
  })
  .build();
