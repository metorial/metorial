import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSessionAttendees = SlateTool.create(spec, {
  name: 'Get Session Attendees',
  key: 'get_session_attendees',
  description: `Retrieves the list of attendees for a specific session, including details and poll results if available. Useful for attendance tracking and follow-up.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the conference room'),
      sessionId: z.string().describe('ID of the session')
    })
  )
  .output(
    z.object({
      attendees: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of session attendees')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSessionAttendees(ctx.input.roomId, ctx.input.sessionId);
    let attendees = Array.isArray(result) ? result : [];

    return {
      output: { attendees },
      message: `Found **${attendees.length}** attendee(s) for session ${ctx.input.sessionId}.`
    };
  })
  .build();
