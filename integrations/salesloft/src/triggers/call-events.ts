import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let EVENT_TYPES = ['call_created', 'call_updated'] as const;

export let callEvents = SlateTrigger.create(spec, {
  name: 'Call Events',
  key: 'call_events',
  description: 'Triggers when a call is created or updated in SalesLoft.'
})
  .input(
    z.object({
      eventType: z.enum(EVENT_TYPES).describe('Type of call event'),
      eventId: z.string().describe('Unique event identifier'),
      call: z.any().describe('Call data from webhook payload')
    })
  )
  .output(
    z.object({
      callId: z.number().describe('SalesLoft call ID'),
      to: z.string().nullable().optional().describe('Called phone number'),
      duration: z.number().nullable().optional().describe('Call duration in seconds'),
      sentiment: z.string().nullable().optional().describe('Call sentiment'),
      disposition: z.string().nullable().optional().describe('Call disposition'),
      status: z.string().nullable().optional().describe('Call status'),
      note: z.string().nullable().optional().describe('Call notes'),
      personId: z.number().nullable().optional().describe('Associated person ID'),
      userId: z.number().nullable().optional().describe('Caller user ID'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations: Array<{ subscriptionId: number; eventType: string }> = [];

      for (let eventType of EVENT_TYPES) {
        let subscription = await client.createWebhookSubscription(
          ctx.input.webhookBaseUrl,
          eventType
        );
        registrations.push({
          subscriptionId: subscription.id,
          eventType
        });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registrations: Array<{ subscriptionId: number }>;
      };

      for (let reg of details.registrations) {
        try {
          await client.deleteWebhookSubscription(reg.subscriptionId);
        } catch (_e) {
          // Subscription may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = ctx.request.headers.get('x-salesloft-event') || 'call_updated';

      return {
        inputs: [
          {
            eventType: eventType as (typeof EVENT_TYPES)[number],
            eventId: `${eventType}_${body?.id || Date.now()}`,
            call: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.call;

      return {
        type: `call.${ctx.input.eventType.replace('call_', '')}`,
        id: ctx.input.eventId,
        output: {
          callId: raw.id,
          to: raw.to,
          duration: raw.duration,
          sentiment: raw.sentiment,
          disposition: raw.disposition,
          status: raw.status,
          note: raw.note,
          personId: raw.person?.id ?? null,
          userId: raw.user?.id ?? null,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at
        }
      };
    }
  })
  .build();
