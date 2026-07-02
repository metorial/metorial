import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let meetingEvents = SlateTrigger.create(spec, {
  name: 'Meeting Events',
  key: 'meeting_events',
  description:
    'Triggers on Zoom meeting lifecycle events: created, updated, deleted, started, ended, and participant join/leave events.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The specific event type (e.g., meeting.started, meeting.ended)'),
      eventTimestamp: z.number().optional().describe('Event timestamp in milliseconds'),
      accountId: z.string().optional().describe('Zoom account ID'),
      meeting: z.any().describe('Meeting object from the webhook payload'),
      participant: z.any().optional().describe('Participant object for join/leave events')
    })
  )
  .output(
    z.object({
      meetingId: z.number().optional().describe('Meeting ID'),
      meetingUuid: z.string().optional().describe('Meeting UUID'),
      topic: z.string().optional().describe('Meeting topic'),
      hostId: z.string().optional().describe('Host user ID'),
      type: z.number().optional().describe('Meeting type'),
      startTime: z.string().optional().describe('Meeting start time'),
      duration: z.number().optional().describe('Meeting duration in minutes'),
      timezone: z.string().optional().describe('Meeting timezone'),
      participantName: z
        .string()
        .optional()
        .describe('Participant name (for join/leave events)'),
      participantEmail: z
        .string()
        .optional()
        .describe('Participant email (for join/leave events)'),
      participantJoinTime: z.string().optional().describe('Participant join time'),
      participantLeaveTime: z.string().optional().describe('Participant leave time')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Handle Zoom CRC validation challenge
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

      if (!eventType?.startsWith('meeting.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventTimestamp: body.event_ts,
            accountId: body.payload?.account_id,
            meeting: body.payload?.object || {},
            participant: body.payload?.object?.participant
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let meeting = ctx.input.meeting as any;
      let participant = ctx.input.participant as any;

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${meeting?.uuid || meeting?.id}-${ctx.input.eventTimestamp || Date.now()}`,
        output: {
          meetingId: meeting?.id as number | undefined,
          meetingUuid: meeting?.uuid as string | undefined,
          topic: meeting?.topic as string | undefined,
          hostId: meeting?.host_id as string | undefined,
          type: meeting?.type as number | undefined,
          startTime: meeting?.start_time as string | undefined,
          duration: meeting?.duration as number | undefined,
          timezone: meeting?.timezone as string | undefined,
          participantName: (participant?.user_name || participant?.participant_name) as
            | string
            | undefined,
          participantEmail: (participant?.email || participant?.user_email) as
            | string
            | undefined,
          participantJoinTime: participant?.join_time as string | undefined,
          participantLeaveTime: participant?.leave_time as string | undefined
        }
      };
    }
  })
  .build();
