import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let meetingEventTypes = [
  'meeting_request_success',
  'new_meeting_request',
  'meeting_request_expired',
  'meeting_request_cancelled',
  'meeting_rescheduled',
  'meeting_completed',
  'meeting_started'
] as const;

export let meetingEvents = SlateTrigger.create(spec, {
  name: 'Meeting Events',
  key: 'meeting_events',
  description:
    'Triggers when meeting-related events occur, including new meeting requests, scheduled meetings, cancellations, expirations, rescheduling, and meeting start/completion.'
})
  .input(
    z.object({
      eventType: z.string().describe('The CalendarHero event type'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      meetingId: z.string().optional().describe('Meeting or request ID'),
      subject: z.string().optional().describe('Meeting subject'),
      start: z.string().optional().describe('Meeting start time'),
      end: z.string().optional().describe('Meeting end time'),
      attendees: z
        .array(
          z.object({
            name: z.string().optional(),
            email: z.string().optional()
          })
        )
        .optional()
        .describe('Meeting attendees'),
      location: z.string().optional().describe('Meeting location or video link'),
      meetingType: z.string().optional().describe('Meeting type used'),
      status: z.string().optional().describe('Meeting or request status'),
      raw: z.any().optional().describe('Full event payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);

      let registrations: Array<{ event: string; hookUrl: string }> = [];

      for (let eventType of meetingEventTypes) {
        let hookUrl = `${ctx.input.webhookBaseUrl}/${eventType}`;
        await client.createWebhook(eventType, hookUrl);
        registrations.push({ event: eventType, hookUrl });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);

      for (let eventType of meetingEventTypes) {
        try {
          await client.deleteWebhook(eventType);
        } catch (_e) {
          // Ignore errors during unregistration
        }
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');
      let eventType = pathParts[pathParts.length - 1] || 'unknown';

      // If the event type isn't in the URL, try to extract from payload
      if (!meetingEventTypes.includes(eventType as any)) {
        eventType = data?.event || data?.type || 'unknown';
      }

      return {
        inputs: [
          {
            eventType,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p: any = ctx.input.payload || {};
      let meeting: any = p.meeting || p.event || p.data || p;

      let attendees = (meeting.attendees || meeting.contacts || []).map((a: any) => ({
        name: a.name || a.displayName,
        email: a.email
      }));

      let eventId =
        meeting._id || meeting.id || p._id || p.id || `${ctx.input.eventType}-${Date.now()}`;

      return {
        type: `meeting.${ctx.input.eventType}`,
        id: String(eventId),
        output: {
          meetingId: meeting._id || meeting.id || p._id || p.id,
          subject: meeting.subject || meeting.title || meeting.name,
          start: meeting.start || meeting.dateStart || meeting.startTime,
          end: meeting.end || meeting.dateEnd || meeting.endTime,
          attendees,
          location: meeting.location || meeting.where,
          meetingType: meeting.meetingType || meeting.type,
          status: meeting.status || meeting.state,
          raw: p
        }
      };
    }
  })
  .build();
