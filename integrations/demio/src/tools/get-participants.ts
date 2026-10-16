import { SlateTool } from 'slates';
import { z } from 'zod';
import { DemioClient } from '../lib/client';
import { spec } from '../spec';

let participantSchema = z.object({
  name: z.string().optional().describe('Name of the participant'),
  email: z.string().optional().describe('Email address of the participant'),
  status: z
    .string()
    .optional()
    .describe(
      'Attendance status returned by Demio (e.g., completed, did not attend, left early, or banned)'
    ),
  attended: z.boolean().optional().describe('Whether the participant attended'),
  customFields: z
    .array(z.object({ id: z.string(), name: z.string(), value: z.string() }))
    .optional()
    .describe('Registration form field identifiers, labels, and values'),
  joinedAt: z.string().optional().describe('Timestamp when the participant joined'),
  leftAt: z.string().optional().describe('Timestamp when the participant left'),
  attendanceMinutes: z.number().optional().describe('Total minutes the participant attended')
});

export let getParticipants = SlateTool.create(spec, {
  name: 'Get Participants',
  key: 'get_participants',
  description: `Retrieve participants for a specific event session, including attendance status and registration form fields. Filter attended participants, no-shows, completed sessions, early departures, or banned participants.`,
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
        .describe(
          'Demio status filter: attended, did-not-attend, completed, left-early, or banned. Spaced aliases did not attend and left early are also accepted.'
        )
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

    let status = ctx.input.status?.toLowerCase();
    if (status === 'did not attend') status = 'did-not-attend';
    if (status === 'left early') status = 'left-early';
    let rawParticipants = await client.getEventDateParticipants(ctx.input.dateId, status);

    let participants = rawParticipants.map(p => ({
      name: p.name,
      email: p.email,
      status: p.status,
      attended: p.attended,
      customFields: p.custom_fields,
      joinedAt: p.joined_at,
      leftAt: p.left_at,
      attendanceMinutes: p.attendance_minutes
    }));

    return {
      output: { participants },
      message: `Found **${participants.length}** participant(s) for event date ${ctx.input.dateId}.`
    };
  })
  .build();
