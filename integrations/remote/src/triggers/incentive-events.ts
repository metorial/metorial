import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let INCENTIVE_EVENTS = [
  'incentive.created',
  'incentive.updated',
  'incentive.deleted',
  'incentive.processing_started',
  'incentive.paid'
];

export let incentiveEvents = SlateTrigger.create(spec, {
  name: 'Incentive Events',
  key: 'incentive_events',
  description:
    'Triggered when incentive events occur, including creation, updates, deletion, processing, and payment.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of incentive event'),
      eventId: z.string().describe('Unique event identifier'),
      employmentId: z.string().describe('Employment ID related to the incentive'),
      incentiveId: z.string().optional().describe('Incentive ID'),
      eventPayload: z.record(z.string(), z.any()).describe('Full event payload from Remote')
    })
  )
  .output(
    z.object({
      employmentId: z.string().describe('Employment ID related to the incentive'),
      incentiveId: z.string().optional().describe('Incentive ID'),
      eventPayload: z.record(z.string(), z.any()).describe('Full event payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.auth.environment ?? 'production'
      });

      let result = await client.createWebhookCallback(
        ctx.input.webhookBaseUrl,
        INCENTIVE_EVENTS
      );
      let callback = result?.data ?? result?.webhook_callback ?? result;

      return {
        registrationDetails: {
          callbackId: callback?.id ?? callback?.webhook_callback_id,
          signingKey: callback?.signing_key
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.auth.environment ?? 'production'
      });

      await client.deleteWebhookCallback(ctx.input.registrationDetails.callbackId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let employmentId: string = data?.employment_id ?? '';
      let incentiveId: string | undefined =
        data?.incentive_id ?? data?.resource_id ?? undefined;
      let eventType: string = data?.event_type ?? '';
      let eventId: string =
        data?.event_id ??
        data?.id ??
        `${eventType}-${incentiveId ?? employmentId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            employmentId,
            incentiveId,
            eventPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          employmentId: ctx.input.employmentId,
          incentiveId: ctx.input.incentiveId,
          eventPayload: ctx.input.eventPayload
        }
      };
    }
  });
