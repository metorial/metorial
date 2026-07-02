import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let EVENT_TYPES = ['meeting_booked', 'meeting_updated'] as const;

export let meetingEvents = SlateTrigger.create(spec, {
  name: 'Meeting Events',
  key: 'meeting_events',
  description: 'Triggers when a meeting is booked or updated in SalesLoft.'
})
  .input(
    z.object({
      eventType: z.enum(EVENT_TYPES).describe('Type of meeting event'),
      eventId: z.string().describe('Unique event identifier'),
      meeting: z.any().describe('Meeting data from webhook payload')
    })
  )
  .output(
    z.object({
      meetingId: z.number().describe('SalesLoft meeting ID'),
      title: z.string().nullable().optional().describe('Meeting title'),
      startTime: z.string().nullable().optional().describe('Meeting start time'),
      endTime: z.string().nullable().optional().describe('Meeting end time'),
      status: z.string().nullable().optional().describe('Meeting status'),
      allDay: z.boolean().nullable().optional().describe('Whether this is an all-day event'),
      attendees: z.array(z.any()).nullable().optional().describe('Meeting attendees'),
      personId: z.number().nullable().optional().describe('Associated person ID'),
      userId: z.number().nullable().optional().describe('Host user ID'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations: Array<{ subscriptionId: number; eventType: string }> = [];

      for (let eventType of EVENT_TYPES) {
        let subscription = await client.createWebhookSubscription(
          ctx.input.webhookBaseUrl,
          eventType
        );
        registrations.push({
          subscriptionId: subscription.id,
          eventType
        });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registrations: Array<{ subscriptionId: number }>;
      };

      for (let reg of details.registrations) {
        try {
          await client.deleteWebhookSubscription(reg.subscriptionId);
        } catch (_e) {
          // Subscription may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = ctx.request.headers.get('x-salesloft-event') || 'meeting_updated';

      return {
        inputs: [
          {
            eventType: eventType as (typeof EVENT_TYPES)[number],
            eventId: `${eventType}_${body?.id || Date.now()}`,
            meeting: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.meeting;
      let action = ctx.input.eventType === 'meeting_booked' ? 'booked' : 'updated';

      return {
        type: `meeting.${action}`,
        id: ctx.input.eventId,
        output: {
          meetingId: raw.id,
          title: raw.title,
          startTime: raw.start_time,
          endTime: raw.end_time,
          status: raw.status,
          allDay: raw.all_day,
          attendees: raw.attendees,
          personId: raw.person?.id ?? null,
          userId: raw.user?.id ?? null,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at
        }
      };
    }
  })
  .build();
