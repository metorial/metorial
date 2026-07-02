import { SlateTool } from 'slates';
import { z } from 'zod';
import { DemioClient } from '../lib/client';
import { spec } from '../spec';

let participantSchema = z.object({
  name: z.string().optional().describe('Name of the participant'),
  email: z.string().optional().describe('Email address of the participant'),
  status: z.string().optional().describe('Attendance status (e.g., attended, did-not-attend)'),
  joinedAt: z.string().optional().describe('Timestamp when the participant joined'),
  leftAt: z.string().optional().describe('Timestamp when the participant left'),
  attendanceMinutes: z.number().optional().describe('Total minutes the participant attended')
});

export let getParticipants = SlateTool.create(spec, {
  name: 'Get Participants',
  key: 'get_participants',
  description: `Retrieve the list of participants for a specific event date/session. Returns attendee details including attendance status, join/leave times, and engagement data. Useful for post-webinar follow-up and reporting.`,
  instructions: [
    'The dateId refers to a specific event date/session, not the event itself. Use the List Events or Get Event tool first to find available date IDs.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dateId: z.string().describe('The event date/session ID to retrieve participants for'),
      status: z
        .string()
        .optional()
        .describe('Filter participants by status (e.g., "attended", "did-not-attend")')
    })
  )
  .output(
    z.object({
      participants: z
        .array(participantSchema)
        .describe('List of participants for the event date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DemioClient({
      token: ctx.auth.token,
      apiSecret: ctx.auth.apiSecret
    });

    let rawParticipants = await client.getEventDateParticipants(ctx.input.dateId);

    let participants = (Array.isArray(rawParticipants) ? rawParticipants : []).map(p => ({
      name: p.name,
      email: p.email,
      status: p.status,
      joinedAt: p.joined_at,
      leftAt: p.left_at,
      attendanceMinutes: p.attendance_minutes
    }));

    if (ctx.input.status) {
      let filterStatus = ctx.input.status.toLowerCase();
      participants = participants.filter(p => p.status?.toLowerCase() === filterStatus);
    }

    return {
      output: { participants },
      message: `Found **${participants.length}** participant(s) for event date ${ctx.input.dateId}.`
    };
  })
  .build();
