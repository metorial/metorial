import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let TIMEOFF_EVENTS = [
  'timeoff.requested',
  'timeoff.approved',
  'timeoff.declined',
  'timeoff.cancelled',
  'timeoff.date_changed',
  'timeoff.taken',
  'timeoff.started',
  'timeoff.updated',
  'timeoff_cancellation.requested'
];

export let timeoffEvents = SlateTrigger.create(spec, {
  name: 'Time Off Events',
  key: 'timeoff_events',
  description:
    'Triggered when time off events occur, including requests, approvals, declines, cancellations, and date changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of time off event'),
      eventId: z.string().describe('Unique event identifier'),
      employmentId: z.string().describe('Employment ID related to the time off'),
      timeoffId: z.string().optional().describe('Time off record ID'),
      eventPayload: z.record(z.string(), z.any()).describe('Full event payload from Remote')
    })
  )
  .output(
    z.object({
      employmentId: z.string().describe('Employment ID related to the time off'),
      timeoffId: z.string().optional().describe('Time off record ID'),
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
        TIMEOFF_EVENTS
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
      let timeoffId: string | undefined = data?.timeoff_id ?? data?.resource_id ?? undefined;
      let eventType: string = data?.event_type ?? '';
      let eventId: string =
        data?.event_id ??
        data?.id ??
        `${eventType}-${timeoffId ?? employmentId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            employmentId,
            timeoffId,
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
          timeoffId: ctx.input.timeoffId,
          eventPayload: ctx.input.eventPayload
        }
      };
    }
  });
