import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let eventLifecycle = SlateTrigger.create(spec, {
  name: 'Event Lifecycle',
  key: 'event_lifecycle',
  description:
    'Triggered when an event is created, updated, published, or unpublished in your Eventbrite account.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe('The webhook action (e.g., "event.created", "event.updated").'),
      apiUrl: z.string().describe('The API URL to fetch the full event resource.')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('The unique ID of the event.'),
      name: z.string().optional().describe('The name/title of the event.'),
      description: z.string().optional().describe('HTML description of the event.'),
      url: z.string().optional().describe('The public URL of the event.'),
      startUtc: z.string().optional().describe('UTC start time.'),
      startTimezone: z.string().optional().describe('Timezone of the start time.'),
      endUtc: z.string().optional().describe('UTC end time.'),
      endTimezone: z.string().optional().describe('Timezone of the end time.'),
      status: z.string().optional().describe('Current status of the event.'),
      capacity: z.number().optional().describe('Maximum capacity.'),
      organizationId: z.string().optional().describe('The owning organization ID.'),
      venueId: z.string().optional().describe('The venue ID.'),
      organizerId: z.string().optional().describe('The organizer ID.'),
      onlineEvent: z.boolean().optional().describe('Whether this is an online event.'),
      listed: z.boolean().optional().describe('Whether the event is publicly listed.'),
      created: z.string().optional().describe('When the event was created.'),
      changed: z.string().optional().describe('When the event was last changed.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      if (!ctx.config.organizationId) {
        throw new Error('Organization ID is required in config to register webhooks.');
      }

      let client = new Client({ token: ctx.auth.token });

      let actions = 'event.created,event.updated,event.published,event.unpublished';

      let webhook = await client.createWebhook(ctx.config.organizationId, {
        endpoint_url: ctx.input.webhookBaseUrl,
        actions
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            action: body.config?.action || 'event.updated',
            apiUrl: body.api_url || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let eventId = extractIdFromUrl(ctx.input.apiUrl);
      let event: any = {};

      if (eventId) {
        try {
          event = await client.getEvent(eventId);
        } catch (_e) {
          // If we can't fetch the event (e.g., deleted), return minimal data
          event = { id: eventId };
        }
      }

      let actionType = ctx.input.action.replace('event.', 'event.');

      return {
        type: actionType,
        id: `${actionType}-${event.id || eventId || Date.now()}`,
        output: {
          eventId: event.id || eventId || '',
          name: event.name?.html || event.name?.text,
          description: event.description?.html,
          url: event.url,
          startUtc: event.start?.utc,
          startTimezone: event.start?.timezone,
          endUtc: event.end?.utc,
          endTimezone: event.end?.timezone,
          status: event.status,
          capacity: event.capacity,
          organizationId: event.organization_id,
          venueId: event.venue_id,
          organizerId: event.organizer_id,
          onlineEvent: event.online_event,
          listed: event.listed,
          created: event.created,
          changed: event.changed
        }
      };
    }
  })
  .build();

let extractIdFromUrl = (apiUrl: string): string | null => {
  let match = apiUrl.match(/\/events\/(\d+)\//);
  return match?.[1] ?? null;
};
