import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let webinarEvents = SlateTrigger.create(spec, {
  name: 'Webinar Events',
  key: 'webinar_events',
  description:
    'Triggers on Zoom webinar lifecycle events: created, updated, deleted, started, ended, registration, and attendee join/leave events.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The specific event type (e.g., webinar.started, webinar.ended)'),
      eventTimestamp: z.number().optional().describe('Event timestamp in milliseconds'),
      accountId: z.string().optional().describe('Zoom account ID'),
      webinar: z.any().describe('Webinar object from the webhook payload'),
      registrant: z.any().optional().describe('Registrant data for registration events')
    })
  )
  .output(
    z.object({
      webinarId: z.number().optional().describe('Webinar ID'),
      webinarUuid: z.string().optional().describe('Webinar UUID'),
      topic: z.string().optional().describe('Webinar topic'),
      hostId: z.string().optional().describe('Host user ID'),
      type: z.number().optional().describe('Webinar type'),
      startTime: z.string().optional().describe('Webinar start time'),
      duration: z.number().optional().describe('Webinar duration in minutes'),
      timezone: z.string().optional().describe('Webinar timezone'),
      registrantEmail: z
        .string()
        .optional()
        .describe('Registrant email (for registration events)'),
      registrantFirstName: z.string().optional().describe('Registrant first name'),
      registrantLastName: z.string().optional().describe('Registrant last name')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.event === 'endpoint.url_validation') {
        return {
          inputs: [],
          response: new Response(
            JSON.stringify({
              plainToken: body.payload?.plainToken,
              encryptedToken: body.payload?.plainToken
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        };
      }

      let eventType = body.event as string;

      if (!eventType?.startsWith('webinar.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventTimestamp: body.event_ts,
            accountId: body.payload?.account_id,
            webinar: body.payload?.object || {},
            registrant: body.payload?.object?.registrant
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let webinar = ctx.input.webinar as any;
      let registrant = ctx.input.registrant as any;

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${webinar?.uuid || webinar?.id}-${ctx.input.eventTimestamp || Date.now()}`,
        output: {
          webinarId: webinar?.id as number | undefined,
          webinarUuid: webinar?.uuid as string | undefined,
          topic: webinar?.topic as string | undefined,
          hostId: webinar?.host_id as string | undefined,
          type: webinar?.type as number | undefined,
          startTime: webinar?.start_time as string | undefined,
          duration: webinar?.duration as number | undefined,
          timezone: webinar?.timezone as string | undefined,
          registrantEmail: registrant?.email as string | undefined,
          registrantFirstName: registrant?.first_name as string | undefined,
          registrantLastName: registrant?.last_name as string | undefined
        }
      };
    }
  })
  .build();
