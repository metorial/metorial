import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let numberEventTypes = [
  'number.created',
  'number.deleted',
  'number.opened',
  'number.closed'
] as const;

export let numberEvents = SlateTrigger.create(spec, {
  name: 'Number Events',
  key: 'number_events',
  description:
    'Triggers when phone number events occur including creation, deletion, and open/close status changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of number event'),
      timestamp: z.number().describe('Event timestamp as UNIX timestamp'),
      webhookToken: z.string().describe('Webhook verification token'),
      number: z.any().describe('The number data from the event payload')
    })
  )
  .output(
    z.object({
      numberId: z.number().describe('Unique number identifier'),
      name: z.string().nullable().describe('Display name'),
      digits: z.string().describe('Phone number in E.164 format'),
      country: z.string().nullable().describe('Country code'),
      timeZone: z.string().nullable().describe('Timezone'),
      open: z.boolean().describe('Whether the number is currently open')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let webhook = await client.createWebhook(
        ctx.input.webhookBaseUrl,
        [...numberEventTypes],
        'slates-number-events'
      );
      return {
        registrationDetails: {
          webhookId: webhook.webhook_id,
          token: webhook.token
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let details = ctx.input.registrationDetails as { webhookId: number };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.resource !== 'number') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.event,
            timestamp: data.timestamp,
            webhookToken: data.token || '',
            number: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let num = ctx.input.number;

      return {
        type: ctx.input.eventType,
        id: `${num.id}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output: {
          numberId: num.id,
          name: num.name ?? null,
          digits: num.digits || '',
          country: num.country ?? null,
          timeZone: num.time_zone ?? null,
          open: num.open ?? false
        }
      };
    }
  })
  .build();
