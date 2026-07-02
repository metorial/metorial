import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let calendarInviteeSchema = z.object({
  displayName: z.string().describe('Display name of the invitee'),
  email: z.string().describe('Email address of the invitee')
});

let recordedBySchema = z.object({
  displayName: z.string().describe('Display name of the recorder'),
  email: z.string().describe('Email address of the recorder')
});

let meetingSchema = z.object({
  recordingId: z.number().describe('Unique recording ID for referencing in other endpoints'),
  title: z.string().describe('Title of the meeting'),
  meetingTitle: z.string().nullable().describe('Calendar event title'),
  meetingUrl: z.string().describe('URL to the meeting in Fathom'),
  shareUrl: z.string().describe('Shareable link to the meeting recording'),
  createdAt: z.string().describe('When the meeting was created (ISO 8601)'),
  scheduledStartTime: z.string().nullable().describe('Calendar scheduled start time'),
  scheduledEndTime: z.string().nullable().describe('Calendar scheduled end time'),
  recordingStartTime: z.string().nullable().describe('Actual recording start time'),
  recordingEndTime: z.string().nullable().describe('Actual recording end time'),
  domainsType: z
    .string()
    .nullable()
    .describe('Whether meeting is only_internal or one_or_more_external'),
  transcriptLanguage: z.string().nullable().describe('Language of the transcript'),
  recordedBy: recordedBySchema.nullable().describe('User who recorded the meeting'),
  calendarInvitees: z
    .array(calendarInviteeSchema)
    .describe('Calendar invitees for this meeting')
});

export let listMeetings = SlateTool.create(spec, {
  name: 'List Meetings',
  key: 'list_meetings',
  description: `List meetings recorded by the authenticated user or shared to their team. Supports filtering by date range, recorder, team, invitee domains, and meeting type. Returns paginated results with meeting metadata.

Use **cursor** for pagination through large result sets.`,
  instructions: [
    'Use createdAfter/createdBefore with ISO 8601 timestamps (e.g., 2025-01-01T00:00:00Z) to filter by date range.',
    'Use the cursor from the response to fetch the next page of results.'
  ],
  constraints: [
    'Rate limited to 60 requests per minute.',
    'Returns up to 10 meetings per page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter meetings created after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter meetings created before this ISO 8601 timestamp'),
      recordedBy: z
        .array(z.string())
        .optional()
        .describe('Filter by recorder email addresses'),
      teams: z.array(z.string()).optional().describe('Filter by team names'),
      calendarInvitees: z
        .array(z.string())
        .optional()
        .describe('Filter by calendar invitee email addresses'),
      calendarInviteesDomains: z
        .array(z.string())
        .optional()
        .describe('Filter by calendar invitee domains'),
      calendarInviteesDomainsType: z
        .enum(['all', 'only_internal', 'one_or_more_external'])
        .optional()
        .describe('Filter by domain type'),
      includeActionItems: z
        .boolean()
        .optional()
        .describe('Include action items in the response'),
      includeCrmMatches: z.boolean().optional().describe('Include CRM matches in the response')
    })
  )
  .output(
    z.object({
      meetings: z.array(meetingSchema).describe('List of meetings'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for the next page of results, null if no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMeetings({
      cursor: ctx.input.cursor,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      recordedBy: ctx.input.recordedBy,
      teams: ctx.input.teams,
      calendarInvitees: ctx.input.calendarInvitees,
      calendarInviteesDomains: ctx.input.calendarInviteesDomains,
      calendarInviteesDomainsType: ctx.input.calendarInviteesDomainsType,
      includeActionItems: ctx.input.includeActionItems,
      includeCrmMatches: ctx.input.includeCrmMatches
    });

    let meetings = result.items.map(meeting => ({
      recordingId: meeting.recording_id,
      title: meeting.title,
      meetingTitle: meeting.meeting_title,
      meetingUrl: meeting.url,
      shareUrl: meeting.share_url,
      createdAt: meeting.created_at,
      scheduledStartTime: meeting.scheduled_start_time,
      scheduledEndTime: meeting.scheduled_end_time,
      recordingStartTime: meeting.recording_start_time,
      recordingEndTime: meeting.recording_end_time,
      domainsType: meeting.calendar_invitees_domains_type,
      transcriptLanguage: meeting.transcript_language,
      recordedBy: meeting.recorded_by
        ? {
            displayName: meeting.recorded_by.display_name,
            email: meeting.recorded_by.email
          }
        : null,
      calendarInvitees: (meeting.calendar_invitees || []).map(invitee => ({
        displayName: invitee.display_name,
        email: invitee.email
      }))
    }));

    return {
      output: {
        meetings,
        nextCursor: result.next_cursor
      },
      message: `Found **${meetings.length}** meeting(s).${result.next_cursor ? ' More results available — use the cursor to fetch the next page.' : ''}`
    };
  })
  .build();
