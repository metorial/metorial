import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { DemioClient } from '../lib/client';
import { spec } from '../spec';

export let webinarEvents = SlateTrigger.create(spec, {
  name: 'Webinar Events',
  key: 'webinar_events',
  description:
    'Triggers on Demio webinar events including new registrations, attendee joins, webinar completions, and no-shows.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The type of webhook event (e.g., registration.created, attendee.joined)'),
      eventPayload: z
        .record(z.string(), z.unknown())
        .describe('The full event payload from Demio')
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('Email address of the registrant or attendee'),
      name: z.string().optional().describe('Name of the registrant or attendee'),
      eventName: z.string().optional().describe('Name of the webinar event'),
      eventId: z.string().optional().describe('ID of the webinar event'),
      dateId: z.string().optional().describe('ID of the event date/session'),
      joinLink: z.string().optional().describe('Join link for the registrant')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new DemioClient({
        token: ctx.auth.token,
        apiSecret: ctx.auth.apiSecret
      });

      let result = await client.registerWebhook(ctx.input.webhookBaseUrl, [
        'registration.created',
        'attendee.joined'
      ]);

      return {
        registrationDetails: result
      };
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (data.event as string) ?? 'unknown';
      let payload = (data.payload as Record<string, unknown>) ?? data;

      return {
        inputs: [
          {
            eventType,
            eventPayload: payload
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload;

      let email = (payload.email as string) ?? undefined;
      let name = (payload.name as string) ?? undefined;
      let eventName =
        (payload.event_name as string) ?? (payload.webinar_name as string) ?? undefined;
      let eventId = payload.event_id != null ? String(payload.event_id) : undefined;
      let dateId = payload.date_id != null ? String(payload.date_id) : undefined;
      let joinLink = (payload.join_link as string) ?? undefined;

      let uniqueId = `${ctx.input.eventType}-${email ?? ''}-${eventId ?? ''}-${dateId ?? ''}-${Date.now()}`;

      return {
        type: ctx.input.eventType,
        id: uniqueId,
        output: {
          email,
          name,
          eventName,
          eventId,
          dateId,
          joinLink
        }
      };
    }
  })
  .build();
