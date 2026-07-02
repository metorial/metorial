import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

let meetingOutputSchema = z.object({
  meetingId: z.string().describe('Unique ID of the meeting'),
  meetingNumber: z.string().optional().describe('Meeting number for joining'),
  title: z.string().optional().describe('Title of the meeting'),
  agenda: z.string().optional().describe('Meeting agenda'),
  start: z.string().optional().describe('Scheduled start time (ISO 8601)'),
  end: z.string().optional().describe('Scheduled end time (ISO 8601)'),
  timezone: z.string().optional().describe('Timezone of the meeting'),
  hostEmail: z.string().optional().describe('Email of the meeting host'),
  hostDisplayName: z.string().optional().describe('Display name of the host'),
  webLink: z.string().optional().describe('URL to join the meeting'),
  sipAddress: z.string().optional().describe('SIP address for the meeting'),
  state: z.string().optional().describe('Meeting state (active, scheduled, etc.)'),
  meetingType: z
    .string()
    .optional()
    .describe('Type of meeting (scheduledMeeting, meeting, etc.)'),
  recurrence: z.string().optional().describe('Recurrence pattern'),
  created: z.string().optional().describe('Creation timestamp')
});

export let createMeeting = SlateTool.create(spec, {
  name: 'Create Meeting',
  key: 'create_meeting',
  description: `Schedule a new Webex meeting with a title, time, and optional settings like agenda, recurrence, auto-recording, and invitees. Returns the meeting details including the join link.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the meeting'),
      agenda: z.string().optional().describe('Meeting agenda or description'),
      password: z.string().optional().describe('Meeting password'),
      start: z.string().optional().describe('Start time in ISO 8601 format'),
      end: z.string().optional().describe('End time in ISO 8601 format'),
      timezone: z.string().optional().describe('Timezone (e.g. "America/New_York")'),
      recurrence: z.string().optional().describe('Recurrence pattern (RFC 5545 RRULE)'),
      enabledAutoRecordMeeting: z
        .boolean()
        .optional()
        .describe('Automatically record the meeting'),
      allowAnyUserToBeCoHost: z
        .boolean()
        .optional()
        .describe('Allow any participant to be co-host'),
      enabledJoinBeforeHost: z
        .boolean()
        .optional()
        .describe('Allow participants to join before the host'),
      sendEmail: z.boolean().optional().describe('Send email invitations'),
      hostEmail: z
        .string()
        .optional()
        .describe('Host email (admin use for scheduling on behalf of others)'),
      invitees: z
        .array(
          z.object({
            email: z.string().describe('Invitee email address'),
            displayName: z.string().optional().describe('Invitee display name'),
            coHost: z.boolean().optional().describe('Make the invitee a co-host')
          })
        )
        .optional()
        .describe('List of meeting invitees')
    })
  )
  .output(meetingOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.createMeeting({
      title: ctx.input.title,
      agenda: ctx.input.agenda,
      password: ctx.input.password,
      start: ctx.input.start,
      end: ctx.input.end,
      timezone: ctx.input.timezone,
      recurrence: ctx.input.recurrence,
      enabledAutoRecordMeeting: ctx.input.enabledAutoRecordMeeting,
      allowAnyUserToBeCoHost: ctx.input.allowAnyUserToBeCoHost,
      enabledJoinBeforeHost: ctx.input.enabledJoinBeforeHost,
      sendEmail: ctx.input.sendEmail,
      hostEmail: ctx.input.hostEmail,
      invitees: ctx.input.invitees
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
      message: `Meeting **${result.title}** created. Join link: ${result.webLink}`
    };
  })
  .build();

export let updateMeeting = SlateTool.create(spec, {
  name: 'Update Meeting',
  key: 'update_meeting',
  description: `Update a scheduled Webex meeting's details including title, agenda, times, recurrence, and recording settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      meetingId: z.string().describe('ID of the meeting to update'),
      title: z.string().optional().describe('Updated meeting title'),
      agenda: z.string().optional().describe('Updated agenda'),
      password: z.string().optional().describe('Updated meeting password'),
      start: z.string().optional().describe('Updated start time (ISO 8601)'),
      end: z.string().optional().describe('Updated end time (ISO 8601)'),
      timezone: z.string().optional().describe('Updated timezone'),
      recurrence: z.string().optional().describe('Updated recurrence pattern'),
      enabledAutoRecordMeeting: z.boolean().optional().describe('Toggle auto-recording'),
      allowAnyUserToBeCoHost: z.boolean().optional().describe('Toggle co-host for any user'),
      sendEmail: z.boolean().optional().describe('Send update notifications')
    })
  )
  .output(meetingOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.updateMeeting(ctx.input.meetingId, {
      title: ctx.input.title,
      agenda: ctx.input.agenda,
      password: ctx.input.password,
      start: ctx.input.start,
      end: ctx.input.end,
      timezone: ctx.input.timezone,
      recurrence: ctx.input.recurrence,
      enabledAutoRecordMeeting: ctx.input.enabledAutoRecordMeeting,
      allowAnyUserToBeCoHost: ctx.input.allowAnyUserToBeCoHost,
      sendEmail: ctx.input.sendEmail
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
      message: `Meeting **${result.title}** updated.`
    };
  })
  .build();

export let deleteMeeting = SlateTool.create(spec, {
  name: 'Delete Meeting',
  key: 'delete_meeting',
  description: `Cancel and delete a scheduled Webex meeting or meeting series. Optionally notify attendees via email.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      meetingId: z.string().describe('ID of the meeting to delete'),
      hostEmail: z.string().optional().describe('Host email (admin use)'),
      sendEmail: z.boolean().optional().describe('Send cancellation email to attendees')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the meeting was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    await client.deleteMeeting(ctx.input.meetingId, {
      hostEmail: ctx.input.hostEmail,
      sendEmail: ctx.input.sendEmail
    });

    return {
      output: { deleted: true },
      message: `Meeting **${ctx.input.meetingId}** deleted.`
    };
  })
  .build();
