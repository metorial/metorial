import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let eventTrigger = SlateTrigger.create(spec, {
  name: 'Event Changes',
  key: 'event_changes',
  description:
    'Triggers when an event is created or edited in WaiverFile. Covers both new events and edits to existing events.'
})
  .input(
    z.object({
      eventType: z.enum(['newevent', 'editevent']).describe('Type of event change'),
      payload: z.any().describe('Raw webhook payload from WaiverFile')
    })
  )
  .output(
    z.object({
      waiverEventId: z.string().describe('ID of the WaiverFile event'),
      eventName: z.string().optional().describe('Name of the event'),
      dateStart: z.string().optional().describe('Event start date/time'),
      dateEnd: z.string().optional().describe('Event end date/time'),
      eventLocation: z.string().optional().describe('Location of the event'),
      maxParticipants: z.number().optional().describe('Maximum number of participants'),
      lastModified: z.string().optional().describe('Last modified timestamp'),
      rawPayload: z.any().describe('Complete raw webhook payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new WaiverFileClient({
        token: ctx.auth.token,
        siteId: ctx.auth.siteId
      });

      let newEventUrl = `${ctx.input.webhookBaseUrl}/newevent`;
      let editEventUrl = `${ctx.input.webhookBaseUrl}/editevent`;

      await client.subscribeWebhook('newevent', newEventUrl);
      await client.subscribeWebhook('editevent', editEventUrl);

      return {
        registrationDetails: {
          newEventUrl,
          editEventUrl
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WaiverFileClient({
        token: ctx.auth.token,
        siteId: ctx.auth.siteId
      });

      await client.deleteWebhookSubscription('newevent');
      await client.deleteWebhookSubscription('editevent');
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathSegments = url.pathname.split('/');
      let lastSegment = pathSegments[pathSegments.length - 1];

      let eventType: 'newevent' | 'editevent' =
        lastSegment === 'editevent' ? 'editevent' : 'newevent';

      return {
        inputs: [
          {
            eventType,
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { payload, eventType } = ctx.input;
      let waiverEventId =
        payload?.WaiverEventID ?? payload?.waiverEventID ?? String(Date.now());
      let lastModified = payload?.LastModified ?? payload?.lastModified ?? undefined;

      let dedupId =
        eventType === 'editevent'
          ? `${waiverEventId}-${eventType}-${lastModified ?? Date.now()}`
          : `${waiverEventId}-${eventType}`;

      return {
        type: eventType === 'newevent' ? 'event.created' : 'event.edited',
        id: dedupId,
        output: {
          waiverEventId: String(waiverEventId),
          eventName: payload?.EventName ?? payload?.eventName ?? undefined,
          dateStart: payload?.DateStart ?? payload?.dateStart ?? undefined,
          dateEnd: payload?.DateEnd ?? payload?.dateEnd ?? undefined,
          eventLocation: payload?.EventLocation ?? payload?.eventLocation ?? undefined,
          maxParticipants: payload?.MaxParticipants ?? payload?.maxParticipants ?? undefined,
          lastModified,
          rawPayload: payload
        }
      };
    }
  })
  .build();
