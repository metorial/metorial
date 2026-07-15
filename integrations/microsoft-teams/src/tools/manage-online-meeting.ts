import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageOnlineMeeting = SlateTool.create(spec, {
  name: 'Manage Online Meeting',
  key: 'manage_online_meeting',
  description: `Create, get, update, or delete a Microsoft Teams online meeting. Can schedule meetings with a start/end time, subject, and participants.`,
  instructions: [
    'For creating a meeting, provide subject and optionally startDateTime, endDateTime.',
    'For getting or deleting, provide meetingId.',
    'For updating, provide meetingId and the fields to update.'
  ]
})
  .scopes(microsoftTeamsActionScopes.manageOnlineMeeting)
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Action to perform'),
      meetingId: z.string().optional().describe('Meeting ID (required for get/update/delete)'),
      subject: z.string().optional().describe('Meeting subject'),
      startDateTime: z.string().optional().describe('Meeting start time in ISO 8601 format'),
      endDateTime: z.string().optional().describe('Meeting end time in ISO 8601 format'),
      participantUserIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to invite as attendees')
    })
  )
  .output(
    z.object({
      meetingId: z.string().optional().describe('Unique identifier of the meeting'),
      subject: z.string().optional().describe('Meeting subject'),
      startDateTime: z.string().optional().describe('Start time'),
      endDateTime: z.string().optional().describe('End time'),
      joinWebUrl: z.string().optional().describe('URL to join the meeting'),
      meetingCode: z.string().optional().describe('Meeting code for joining'),
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
      let meetings = await client.listOnlineMeetings();
      let mapped = meetings.map((m: any) => ({
        meetingId: m.id,
        subject: m.subject,
        joinWebUrl: m.joinWebUrl,
        startDateTime: m.startDateTime,
        endDateTime: m.endDateTime
      }));
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
          attendees: ctx.input.participantUserIds.map((uid: string) => ({
            upn: uid,
            role: 'attendee'
          }))
        };
      }

      let meeting = await client.createOnlineMeeting(body);
      return {
        output: {
          meetingId: meeting.id,
          subject: meeting.subject,
          startDateTime: meeting.startDateTime,
          endDateTime: meeting.endDateTime,
          joinWebUrl: meeting.joinWebUrl,
          meetingCode: meeting.meetingCode,
          success: true
        },
        message: `Meeting **${meeting.subject}** created. Join URL: ${meeting.joinWebUrl}`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.meetingId) throw new Error('meetingId is required');
      let meeting = await client.getOnlineMeeting(ctx.input.meetingId);
      return {
        output: {
          meetingId: meeting.id,
          subject: meeting.subject,
          startDateTime: meeting.startDateTime,
          endDateTime: meeting.endDateTime,
          joinWebUrl: meeting.joinWebUrl,
          meetingCode: meeting.meetingCode,
          success: true
        },
        message: `Retrieved meeting **${meeting.subject}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.meetingId) throw new Error('meetingId is required');
      let body: any = {};
      if (ctx.input.subject) body.subject = ctx.input.subject;
      if (ctx.input.startDateTime) body.startDateTime = ctx.input.startDateTime;
      if (ctx.input.endDateTime) body.endDateTime = ctx.input.endDateTime;

      let meeting = await client.updateOnlineMeeting(ctx.input.meetingId, body);
      return {
        output: {
          meetingId: meeting.id,
          subject: meeting.subject,
          startDateTime: meeting.startDateTime,
          endDateTime: meeting.endDateTime,
          joinWebUrl: meeting.joinWebUrl,
          success: true
        },
        message: `Meeting updated successfully.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.meetingId) throw new Error('meetingId is required');
      await client.deleteOnlineMeeting(ctx.input.meetingId);
      return {
        output: { meetingId: ctx.input.meetingId, success: true },
        message: `Meeting deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
