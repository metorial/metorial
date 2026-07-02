import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let siteEventsTrigger = SlateTrigger.create(spec, {
  name: 'Site & Business Events',
  key: 'site_events',
  description:
    'Triggers when business settings are updated, site settings are modified, site availability changes, or leads are created.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      webhookPayload: z.record(z.string(), z.any()).describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('The type of site/business event'),
      created: z.string().optional().describe('Timestamp when the event occurred'),
      webhookPayload: z
        .record(z.string(), z.any())
        .describe('Full webhook payload for additional context')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;
      let eventType = (body.type as string) || '';

      let siteEventTypes = [
        'business.updated',
        'site.settings.updated',
        'site.availability.updated',
        'job.lead.created',
        'addon.installed',
        'addon.customFields.validate',
        'addon.dailyEvent.started',
        'billing.list',
        'billing.charge',
        'billing.checkout'
      ];

      if (!siteEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId: body.id || `${eventType}_${body.created || Date.now()}`,
            webhookPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          eventType: ctx.input.eventType,
          created: ctx.input.webhookPayload.created as string | undefined,
          webhookPayload: ctx.input.webhookPayload
        }
      };
    }
  })
  .build();
