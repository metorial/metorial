import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let meetingEvents = SlateTrigger.create(spec, {
  name: 'Meeting Events',
  key: 'meeting_events',
  description: 'Triggers when a meeting is scheduled, cancelled, or rescheduled.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic'),
      timestamp: z.string().optional().describe('Event timestamp'),
      meetingId: z.string().optional().describe('Meeting ID'),
      contactId: z.string().optional().describe('Contact ID'),
      contactEmail: z.string().optional().describe('Contact email'),
      teammateId: z.string().optional().describe('Teammate ID'),
      scheduledAt: z.string().optional().describe('Meeting scheduled time'),
      raw: z.any().optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      meetingId: z.string().optional().describe('Meeting ID'),
      contactId: z.string().optional().describe('Contact ID'),
      contactEmail: z.string().optional().describe('Contact email'),
      teammateId: z.string().optional().describe('Teammate ID'),
      scheduledAt: z.string().optional().describe('Meeting scheduled time'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let topic = data.topic || '';
      let meeting = data.meeting || data.data?.meeting || {};
      let contact = data.contact || data.data?.contact || meeting.contact || {};

      return {
        inputs: [
          {
            topic,
            timestamp: data.timestamp ? String(data.timestamp) : undefined,
            meetingId: meeting.id ? String(meeting.id) : undefined,
            contactId: contact.id ? String(contact.id) : undefined,
            contactEmail: contact.email,
            teammateId: meeting.teammate_id ? String(meeting.teammate_id) : undefined,
            scheduledAt: meeting.scheduled_at ? String(meeting.scheduled_at) : undefined,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let topicMap: Record<string, string> = {
        'meeting.scheduled': 'meeting.scheduled',
        'meeting.cancelled': 'meeting.cancelled',
        'meeting.rescheduled': 'meeting.rescheduled'
      };

      let type = topicMap[ctx.input.topic] || ctx.input.topic;
      let id = `${ctx.input.topic}-${ctx.input.meetingId || ''}-${ctx.input.timestamp || Date.now()}`;

      return {
        type,
        id,
        output: {
          meetingId: ctx.input.meetingId,
          contactId: ctx.input.contactId,
          contactEmail: ctx.input.contactEmail,
          teammateId: ctx.input.teammateId,
          scheduledAt: ctx.input.scheduledAt,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
