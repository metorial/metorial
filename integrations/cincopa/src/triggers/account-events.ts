import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { spec } from '../spec';

export let accountEvents = SlateTrigger.create(spec, {
  name: 'Account Events',
  key: 'account_events',
  description:
    'Triggered on account-level activities such as settings changes and traffic usage updates in your Cincopa account.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of account event (e.g., account.settings, account.traffic_usage)'),
      eventId: z.string().describe('Unique event identifier'),
      payload: z.record(z.string(), z.any()).describe('Full event payload from Cincopa')
    })
  )
  .output(
    z.object({
      eventName: z.string().describe('Name of the event that occurred'),
      timestamp: z.string().optional().describe('When the event occurred'),
      rawPayload: z.record(z.string(), z.any()).describe('Complete event data from Cincopa')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new CincopaClient({ token: ctx.auth.token });
      await client.setWebhook({
        hookUrl: ctx.input.webhookBaseUrl,
        events: 'account.*'
      });
      return {
        registrationDetails: {
          hookUrl: ctx.input.webhookBaseUrl
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new CincopaClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.hookUrl);
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let eventType = body?.event || body?.type || body?.namespace || 'account.unknown';
      let eventId = body?.id || body?.event_id || `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId: String(eventId),
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { payload } = ctx.input;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          eventName: ctx.input.eventType,
          timestamp: (payload?.timestamp || payload?.created_at || payload?.date) as
            | string
            | undefined,
          rawPayload: payload
        }
      };
    }
  })
  .build();
