import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let meetingEvents = SlateTrigger.create(spec, {
  name: 'Meeting Confirmed Events',
  key: 'meeting_events',
  description:
    'Triggers when a recipient confirms a meeting invitation through Mixmax scheduling. Captures the meeting details including selected timeslot, organizer, and guest information.'
})
  .input(
    z.object({
      eventName: z.string().describe('Event type (meetinginvites:confirmed)'),
      eventId: z.string().describe('Unique event identifier'),
      payload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      meetingTitle: z.string().optional().describe('Meeting title'),
      organizerEmail: z.string().optional().describe('Organizer email'),
      organizerName: z.string().optional().describe('Organizer name'),
      guestEmail: z.string().optional().describe('Guest email'),
      guestName: z.string().optional().describe('Guest name'),
      selectedTimeslot: z.any().optional().describe('Selected meeting timeslot'),
      timezone: z.string().optional().describe('Meeting timezone'),
      confirmedAt: z.string().optional().describe('When the meeting was confirmed')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let rule = await client.createRule({
        name: 'Slates: Meeting Confirmed Webhook',
        trigger: { event: 'meetinginvites:confirmed' },
        actions: [
          {
            type: 'webhook',
            url: ctx.input.webhookBaseUrl
          }
        ],
        enabled: true
      });

      return {
        registrationDetails: { ruleId: rule._id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { ruleId: string };

      if (details.ruleId) {
        await client.deleteRule(details.ruleId).catch(() => {});
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      let eventId =
        data.id || `meeting-confirmed-${data.guest?.email}-${data.timestamp || Date.now()}`;

      return {
        inputs: [
          {
            eventName: data.eventName || 'meetinginvites:confirmed',
            eventId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      return {
        type: 'meeting.confirmed',
        id: ctx.input.eventId,
        output: {
          meetingTitle: p.invite?.title || p.title,
          organizerEmail: p.organizer?.email,
          organizerName: p.organizer?.name,
          guestEmail: p.guest?.email,
          guestName: p.guest?.name,
          selectedTimeslot: p.selectedTimeslot,
          timezone: p.invite?.timezone || p.timezone,
          confirmedAt: p.timestamp
        }
      };
    }
  })
  .build();
