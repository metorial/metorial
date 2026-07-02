import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let meetingEvent = SlateTrigger.create(spec, {
  name: 'Meeting Event',
  key: 'meeting_event',
  description: 'Triggers when a meeting is booked, rescheduled, or canceled in Drift.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of meeting event: new_meeting or meeting_updated'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      meetingId: z.string().optional().describe('Meeting identifier'),
      agentId: z.number().optional().describe('Agent user ID'),
      contactId: z.number().optional().describe('Contact ID'),
      conversationId: z.number().optional().describe('Related conversation ID'),
      slotStart: z.number().optional().describe('Meeting start time (epoch ms)'),
      slotEnd: z.number().optional().describe('Meeting end time (epoch ms)'),
      status: z.string().optional().describe('Meeting status (e.g., active, cancelled)'),
      createdAt: z.number().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      meetingId: z.string().optional().describe('Meeting identifier'),
      agentId: z.number().optional().describe('Agent user ID'),
      contactId: z.number().optional().describe('Contact ID'),
      conversationId: z.number().optional().describe('Related conversation ID'),
      slotStart: z.number().optional().describe('Meeting start time (epoch ms)'),
      slotEnd: z.number().optional().describe('Meeting end time (epoch ms)'),
      status: z.string().optional().describe('Meeting status'),
      createdAt: z.number().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.type || 'unknown';
      let eventData = data.data || {};
      let timestamp = data.createdAt || Date.now();

      if (eventType !== 'new_meeting' && eventType !== 'meeting_updated') {
        return { inputs: [] };
      }

      let meetingId =
        eventData.eventId || eventData.id || `${eventData.conversationId}-${timestamp}`;

      return {
        inputs: [
          {
            eventType,
            eventId: `${eventType}-${meetingId}-${timestamp}`,
            meetingId: String(meetingId),
            agentId: eventData.agentId,
            contactId: eventData.contactId,
            conversationId: eventData.conversationId,
            slotStart: eventData.slotStart,
            slotEnd: eventData.slotEnd,
            status: eventData.status,
            createdAt: timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `meeting.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          meetingId: ctx.input.meetingId,
          agentId: ctx.input.agentId,
          contactId: ctx.input.contactId,
          conversationId: ctx.input.conversationId,
          slotStart: ctx.input.slotStart,
          slotEnd: ctx.input.slotEnd,
          status: ctx.input.status,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
