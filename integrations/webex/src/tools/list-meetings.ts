import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

export let listMeetings = SlateTool.create(spec, {
  name: 'List Meetings',
  key: 'list_meetings',
  description: `List scheduled Webex meetings. Filter by meeting number, state, date range, or host email. Returns meeting metadata, join links, and scheduling details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      nextPageUrl: z
        .string()
        .optional()
        .describe(
          'Native next-page URL returned by this tool. Use alone; do not add filters.'
        ),
      meetingNumber: z.string().optional().describe('Filter by meeting number'),
      state: z
        .string()
        .optional()
        .describe(
          'Filter by meeting state (active, scheduled, ready, lobby, inProgress, ended, missed, expired)'
        ),
      meetingType: z
        .string()
        .optional()
        .describe('Filter by type (scheduledMeeting, meeting, meetingSeries)'),
      from: z.string().optional().describe('Start of date range (ISO 8601)'),
      to: z.string().optional().describe('End of date range (ISO 8601)'),
      hostEmail: z.string().optional().describe('Filter by host email (admin use)'),
      max: z.number().optional().describe('Maximum number of results (default 10)')
    })
  )
  .output(
    z.object({
      nextPageUrl: z.string().optional().describe('URL for the next native page, if present'),
      meetings: z
        .array(
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
            webLink: z.string().optional().describe('Join URL'),
            state: z.string().optional().describe('Meeting state'),
            meetingType: z.string().optional().describe('Meeting type')
          })
        )
        .describe('List of meetings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.listMeetings({
      meetingNumber: ctx.input.meetingNumber,
      state: ctx.input.state,
      meetingType: ctx.input.meetingType,
      from: ctx.input.from,
      to: ctx.input.to,
      hostEmail: ctx.input.hostEmail,
      max: ctx.input.max,
      nextPageUrl: ctx.input.nextPageUrl
    });

    let items = result.items || [];
    let meetings = items.map(m => ({
      meetingId: m.id,
      meetingNumber: m.meetingNumber,
      title: m.title,
      agenda: m.agenda,
      start: m.start,
      end: m.end,
      timezone: m.timezone,
      hostEmail: m.hostEmail,
      hostDisplayName: m.hostDisplayName,
      webLink: m.webLink,
      state: m.state,
      meetingType: m.meetingType
    }));

    return {
      output: { meetings, nextPageUrl: result.nextPageUrl },
      message: `Found **${meetings.length}** meeting(s).`
    };
  })
  .build();
