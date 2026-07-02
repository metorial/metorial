import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

export let getMeeting = SlateTool.create(spec, {
  name: 'Get Meeting Details',
  key: 'get_meeting',
  description: `Retrieve full details of a specific Webex meeting by its ID, including join link, host info, scheduling details, and current state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      meetingId: z.string().describe('ID of the meeting to retrieve'),
      hostEmail: z.string().optional().describe('Host email (admin use)')
    })
  )
  .output(
    z.object({
      meetingId: z.string().describe('Unique ID of the meeting'),
      meetingNumber: z.string().optional().describe('Meeting number'),
      title: z.string().optional().describe('Meeting title'),
      agenda: z.string().optional().describe('Meeting agenda'),
      start: z.string().optional().describe('Scheduled start time'),
      end: z.string().optional().describe('Scheduled end time'),
      timezone: z.string().optional().describe('Timezone'),
      hostEmail: z.string().optional().describe('Host email'),
      hostDisplayName: z.string().optional().describe('Host display name'),
      webLink: z.string().optional().describe('URL to join the meeting'),
      sipAddress: z.string().optional().describe('SIP address'),
      state: z.string().optional().describe('Meeting state'),
      meetingType: z.string().optional().describe('Meeting type'),
      recurrence: z.string().optional().describe('Recurrence pattern'),
      created: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.getMeeting(ctx.input.meetingId, {
      hostEmail: ctx.input.hostEmail
    });

    return {
      output: {
        meetingId: result.id,
        meetingNumber: result.meetingNumber,
        title: result.title,
        agenda: result.agenda,
        start: result.start,
        end: result.end,
        timezone: result.timezone,
        hostEmail: result.hostEmail,
        hostDisplayName: result.hostDisplayName,
        webLink: result.webLink,
        sipAddress: result.sipAddress,
        state: result.state,
        meetingType: result.meetingType,
        recurrence: result.recurrence,
        created: result.created
      },
      message: `Meeting **${result.title}** (${result.state}).`
    };
  })
  .build();
