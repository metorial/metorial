import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { meetingSchema } from '../lib/schemas';
import { spec } from '../spec';

export let logMeeting = SlateTool.create(spec, {
  name: 'Log Meeting',
  key: 'log_meeting',
  description: `Log a meeting against a contact to track the interaction. Include meeting details such as location, time, and notes.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact the meeting was with'),
      text: z.string().optional().describe('Meeting notes or description'),
      meetingTimeInt: z.number().optional().describe('Time of the meeting as Unix timestamp'),
      place: z.string().optional().describe('Meeting location')
    })
  )
  .output(meetingSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let meeting = await client.createMeeting(ctx.input);

    return {
      output: meeting,
      message: `Logged meeting (${meeting.meetingId}) for contact ${meeting.contactId}.`
    };
  })
  .build();
