import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { graphAuthMethodKeys } from '../auth';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

let meetingIdRequired = () =>
  createApiServiceError('meetingId is required for this action.', {
    reason: 'microsoft_teams_meeting_id_missing'
  });

// Attendees are a Microsoft Entra user ID (identity.user.id) or a user principal name (upn).
// https://learn.microsoft.com/en-us/graph/api/resources/meetingparticipantinfo?view=graph-rest-1.0
let toAttendee = (value: string) =>
  value.includes('@')
    ? { upn: value, role: 'attendee' }
    : { identity: { user: { id: value } }, role: 'attendee' };

// v1.0 has no meetingCode; the numeric join ID lives in joinMeetingIdSettings.
// https://learn.microsoft.com/en-us/graph/api/resources/onlinemeeting?view=graph-rest-1.0
let mapMeeting = (meeting: any) => ({
  meetingId: meeting.id,
  subject: meeting.subject ?? undefined,
  startDateTime: meeting.startDateTime ?? undefined,
  endDateTime: meeting.endDateTime ?? undefined,
  joinWebUrl: meeting.joinWebUrl ?? undefined,
  meetingCode: meeting.joinMeetingIdSettings?.joinMeetingId ?? undefined
});

// https://learn.microsoft.com/en-us/graph/api/application-post-onlinemeetings?view=graph-rest-1.0
// https://learn.microsoft.com/en-us/graph/api/onlinemeeting-get?view=graph-rest-1.0
export let manageOnlineMeeting = SlateTool.create(spec, {
  name: 'Manage Online Meeting',
  key: 'manage_online_meeting',
  description: `Create, get, update, delete, or look up a Microsoft Teams online meeting organized by the signed-in user. Can schedule meetings with a start/end time, subject, and participants.`,
  instructions: [
    'For creating a meeting, provide subject and optionally startDateTime, endDateTime, and participantUserIds.',
    'For getting or deleting, provide meetingId.',
    'For updating, provide meetingId and the fields to update.',
    'Microsoft Teams cannot list every meeting. Use action "list" with joinWebUrl or joinMeetingId to look a meeting up.'
  ]
})
  .scopes(microsoftTeamsActionScopes.manageOnlineMeeting)
  .authMethods(graphAuthMethodKeys)
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe(
          'Action to perform. "list" looks meetings up by joinWebUrl or joinMeetingId.'
        ),
      meetingId: z.string().optional().describe('Meeting ID (required for get/update/delete)'),
      subject: z.string().optional().describe('Meeting subject'),
      startDateTime: z.string().optional().describe('Meeting start time in ISO 8601 format'),
      endDateTime: z.string().optional().describe('Meeting end time in ISO 8601 format'),
      participantUserIds: z
        .array(z.string())
        .optional()
        .describe(
          'User IDs or user principal names (email-style sign-in names) to invite as attendees'
        ),
      joinWebUrl: z.string().optional().describe('Meeting join URL to look up (for list)'),
      joinMeetingId: z
        .string()
        .optional()
        .describe('Numeric meeting ID people type to join (for list)')
    })
  )
  .output(
    z.object({
      meetingId: z.string().optional().describe('Unique identifier of the meeting'),
      subject: z.string().optional().describe('Meeting subject'),
      startDateTime: z.string().optional().describe('Start time'),
      endDateTime: z.string().optional().describe('End time'),
      joinWebUrl: z.string().optional().describe('URL to join the meeting'),
      meetingCode: z
        .string()
        .optional()
        .describe('Numeric meeting ID people can type to join'),
      meetings: z
        .array(
          z.object({
            meetingId: z.string().describe('Meeting ID'),
            subject: z.string().optional().describe('Subject'),
            joinWebUrl: z.string().optional().describe('Join URL'),
            startDateTime: z.string().optional().describe('Start time'),
            endDateTime: z.string().optional().describe('End time')
          })
        )
        .optional()
        .describe('List of meetings (for list action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      if (!ctx.input.joinWebUrl && !ctx.input.joinMeetingId) {
        throw createApiServiceError(
          'Microsoft Teams only looks meetings up by join link. Provide joinWebUrl or joinMeetingId, or use get with a meetingId.',
          { reason: 'microsoft_teams_meeting_filter_missing' }
        );
      }
      let meetings = await client.findOnlineMeetings({
        joinWebUrl: ctx.input.joinWebUrl,
        joinMeetingId: ctx.input.joinMeetingId
      });
      let mapped = meetings.map((m: any) => {
        let { meetingCode: _meetingCode, ...meeting } = mapMeeting(m);
        return meeting;
      });
      return {
        output: { meetings: mapped, success: true },
        message: `Found **${mapped.length}** online meetings.`
      };
    }

    if (ctx.input.action === 'create') {
      let body: any = {
        subject: ctx.input.subject || 'New Meeting'
      };
      if (ctx.input.startDateTime) body.startDateTime = ctx.input.startDateTime;
      if (ctx.input.endDateTime) body.endDateTime = ctx.input.endDateTime;
      if (ctx.input.participantUserIds && ctx.input.participantUserIds.length > 0) {
        body.participants = {
          attendees: ctx.input.participantUserIds.map(toAttendee)
        };
      }

      let meeting = await client.createOnlineMeeting(body);
      return {
        output: { ...mapMeeting(meeting), success: true },
        message: `Meeting **${meeting.subject ?? 'Untitled'}** created. Join URL: ${meeting.joinWebUrl}`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.meetingId) throw meetingIdRequired();
      let meeting = await client.getOnlineMeeting(ctx.input.meetingId);
      return {
        output: { ...mapMeeting(meeting), success: true },
        message: `Retrieved meeting **${meeting.subject ?? meeting.id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.meetingId) throw meetingIdRequired();
      let body: any = {};
      if (ctx.input.subject) body.subject = ctx.input.subject;
      if (ctx.input.startDateTime) body.startDateTime = ctx.input.startDateTime;
      if (ctx.input.endDateTime) body.endDateTime = ctx.input.endDateTime;

      let meeting = await client.updateOnlineMeeting(ctx.input.meetingId, body);
      return {
        output: { ...mapMeeting(meeting), success: true },
        message: `Meeting updated successfully.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.meetingId) throw meetingIdRequired();
      await client.deleteOnlineMeeting(ctx.input.meetingId);
      return {
        output: { meetingId: ctx.input.meetingId, success: true },
        message: `Meeting deleted successfully.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`, {
      reason: 'microsoft_teams_action_invalid'
    });
  })
  .build();
