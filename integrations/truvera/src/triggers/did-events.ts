import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let DID_EVENTS = [
  'did_create',
  'did_update_key',
  'did_update_controller',
  'did_delete'
] as const;

export let didEvents = SlateTrigger.create(spec, {
  name: 'DID Events',
  key: 'did_events',
  description: 'Triggers when a DID is created, updated (key or controller), or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of DID event'),
      webhookPayload: z.any().describe('Raw webhook payload from Truvera')
    })
  )
  .output(
    z.object({
      did: z.string().optional().describe('The affected DID identifier'),
      didType: z.string().optional().describe('DID method type'),
      controller: z.string().optional().describe('Controller DID'),
      keyType: z.string().optional().describe('Key type'),
      didData: z.any().optional().describe('Additional DID data from the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [...DID_EVENTS],
        description: 'Slates DID events webhook',
        status: 1
      });

      return {
        registrationDetails: {
          webhookId: result?.id,
          secret: result?.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: body.event || 'unknown',
            webhookPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.webhookPayload;
      let data = payload?.data || {};

      let eventType = ctx.input.eventType;
      let eventTypeFormatted = eventType.replace('_', '.');

      return {
        type: eventTypeFormatted,
        id: data?.did || data?.id || `${eventType}-${Date.now()}`,
        output: {
          did: data?.did || data?.id,
          didType: data?.type,
          controller: data?.controller,
          keyType: data?.keyType,
          didData: data
        }
      };
    }
  })
  .build();
