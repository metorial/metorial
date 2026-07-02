import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let recipientEvent = SlateTrigger.create(spec, {
  name: 'Recipient Event',
  key: 'recipient_event',
  description:
    'Triggers whenever a new recipient event is recorded, such as a QR code scan from a Stannp-generated QR code on a postcard or letter.'
})
  .input(
    z.object({
      webhookId: z.number().optional().describe('Webhook ID'),
      event: z.string().describe('Event type'),
      created: z.string().optional().describe('Event creation timestamp'),
      retries: z.string().optional().describe('Number of retry attempts'),
      events: z.array(z.any()).optional().describe('Array of recipient event objects')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Recipient event ID'),
      recipientId: z.string().optional().describe('Associated recipient ID'),
      eventName: z
        .string()
        .optional()
        .describe('Event classification (e.g. PURCHASE, SIGNUP, PAGE_VIEW)'),
      eventValue: z
        .string()
        .optional()
        .describe('Event value (e.g. purchase amount, product name)'),
      conversion: z.boolean().optional().describe('Whether this is a conversion event'),
      eventData: z.string().optional().describe('Extended event metadata'),
      ref: z.string().optional().describe('Campaign or mailpiece reference')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.event === 'test_url') {
        return { inputs: [] };
      }

      let events: any[] = data.events || data.data || [];
      if (!Array.isArray(events)) {
        events = [events];
      }

      return {
        inputs: events.map((evt: any) => ({
          webhookId: data.webhook_id,
          event: data.event || 'recipient_event',
          created: data.created,
          retries: data.retries,
          events: [evt]
        }))
      };
    },

    handleEvent: async ctx => {
      let evt = ctx.input.events?.[0];

      return {
        type: `recipient.event`,
        id: `recipient-event-${evt?.id || 'unknown'}-${ctx.input.created || Date.now()}`,
        output: {
          eventId: String(evt?.id || ''),
          recipientId: evt?.recipient_id != null ? String(evt.recipient_id) : undefined,
          eventName: evt?.name,
          eventValue: evt?.value,
          conversion: evt?.conversion,
          eventData: evt?.data,
          ref: evt?.ref
        }
      };
    }
  })
  .build();
