import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let newEventTrigger = SlateTrigger.create(spec, {
  name: 'New Event',
  key: 'new_event',
  description:
    'Triggers when a new event appears in the Datadog event stream. Polls for events including deployments, alerts, and configuration changes.'
})
  .input(
    z.object({
      eventId: z.number().describe('Event ID'),
      title: z.string().describe('Event title'),
      text: z.string().optional().describe('Event body text'),
      dateHappened: z.number().optional().describe('When the event occurred (Unix timestamp)'),
      priority: z.string().optional().describe('Event priority'),
      host: z.string().optional().describe('Hostname associated with the event'),
      tags: z.array(z.string()).optional().describe('Event tags'),
      alertType: z.string().optional().describe('Alert type'),
      source: z.string().optional().describe('Event source')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Event ID'),
      title: z.string().describe('Event title'),
      text: z.string().optional().describe('Event body text'),
      dateHappened: z.number().optional().describe('When the event occurred (Unix timestamp)'),
      priority: z.string().optional().describe('Event priority'),
      host: z.string().optional().describe('Hostname associated with the event'),
      tags: z.array(z.string()).optional().describe('Event tags'),
      alertType: z.string().optional().describe('Alert type'),
      source: z.string().optional().describe('Event source')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      let state = ctx.state as { lastEventTime?: number } | null;

      let now = Math.floor(Date.now() / 1000);
      let lastEventTime = state?.lastEventTime || now - 300; // Default: last 5 minutes

      let result = await client.listEvents({
        start: lastEventTime,
        end: now
      });

      let events = result.events || [];
      let inputs: Array<{
        eventId: number;
        title: string;
        text?: string;
        dateHappened?: number;
        priority?: string;
        host?: string;
        tags?: string[];
        alertType?: string;
        source?: string;
      }> = [];

      let newestTime = lastEventTime;

      for (let event of events) {
        let eventTime = event.date_happened || 0;
        if (eventTime > lastEventTime) {
          inputs.push({
            eventId: event.id,
            title: event.title,
            text: event.text,
            dateHappened: event.date_happened,
            priority: event.priority,
            host: event.host,
            tags: event.tags,
            alertType: event.alert_type,
            source: event.source
          });

          if (eventTime > newestTime) {
            newestTime = eventTime;
          }
        }
      }

      return {
        inputs,
        updatedState: {
          lastEventTime: newestTime
        }
      };
    },

    handleEvent: async ctx => {
      let alertType = ctx.input.alertType || 'info';
      return {
        type: `event.${alertType.toLowerCase()}`,
        id: String(ctx.input.eventId),
        output: {
          eventId: ctx.input.eventId,
          title: ctx.input.title,
          text: ctx.input.text,
          dateHappened: ctx.input.dateHappened,
          priority: ctx.input.priority,
          host: ctx.input.host,
          tags: ctx.input.tags,
          alertType: ctx.input.alertType,
          source: ctx.input.source
        }
      };
    }
  })
  .build();
