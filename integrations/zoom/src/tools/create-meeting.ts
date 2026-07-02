import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

let recurrenceSchema = z
  .object({
    type: z.number().describe('Recurrence type: 1 (daily), 2 (weekly), 3 (monthly)'),
    repeatInterval: z.number().optional().describe('Repeat interval (e.g., every 2 weeks)'),
    weeklyDays: z
      .string()
      .optional()
      .describe('Comma-separated days: 1=Sun, 2=Mon, ... 7=Sat'),
    monthlyDay: z.number().optional().describe('Day of the month for monthly recurrence'),
    monthlyWeek: z
      .number()
      .optional()
      .describe('Week of the month: -1=last, 1=first, 2=second, 3=third, 4=fourth'),
    monthlyWeekDay: z.number().optional().describe('Day of the week for monthly recurrence'),
    endTimes: z
      .number()
      .optional()
      .describe('Number of times the meeting recurs before ending'),
    endDateTime: z.string().optional().describe('End date-time in UTC (yyyy-MM-ddTHH:mm:ssZ)')
  })
  .optional()
  .describe('Recurrence settings for recurring meetings');

let settingsSchema = z
  .object({
    hostVideo: z.boolean().optional().describe('Start video when the host joins'),
    participantVideo: z.boolean().optional().describe('Start video when participants join'),
    joinBeforeHost: z.boolean().optional().describe('Allow participants to join before host'),
    muteUponEntry: z.boolean().optional().describe('Mute participants upon entry'),
    watermark: z.boolean().optional().describe('Add watermark when viewing shared screen'),
    usePmi: z.boolean().optional().describe('Use Personal Meeting ID'),
    approvalType: z
      .number()
      .optional()
      .describe('0=auto, 1=manual, 2=no registration required'),
    registrationType: z
      .number()
      .optional()
      .describe(
        '1=register once, 2=register each time, 3=register once and choose occurrences'
      ),
    audio: z.enum(['both', 'telephony', 'voip']).optional().describe('Audio options'),
    autoRecording: z
      .enum(['local', 'cloud', 'none'])
      .optional()
      .describe('Automatic recording'),
    waitingRoom: z.boolean().optional().describe('Enable waiting room'),
    meetingAuthentication: z.boolean().optional().describe('Require authentication to join'),
    alternativeHosts: z
      .string()
      .optional()
      .describe('Comma-separated email addresses of alternative hosts'),
    breakoutRoom: z
      .object({
        enable: z.boolean().describe('Enable breakout rooms'),
        rooms: z
          .array(
            z.object({
              name: z.string().describe('Room name'),
              participants: z.array(z.string()).optional().describe('Participant emails')
            })
          )
          .optional()
          .describe('Pre-assigned breakout rooms')
      })
      .optional()
      .describe('Breakout room settings')
  })
  .optional()
  .describe('Meeting settings');

export let createMeeting = SlateTool.create(spec, {
  name: 'Create Meeting',
  key: 'create_meeting',
  description: `Schedule a new Zoom meeting for a user. Supports instant meetings, scheduled meetings, and recurring meetings with full configuration of settings like waiting rooms, breakout rooms, recording, passwords, and more.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .default('me')
        .describe('User ID or email. Use "me" for the authenticated user'),
      topic: z.string().describe('Meeting topic/title'),
      type: z
        .number()
        .default(2)
        .describe(
          '1=instant, 2=scheduled, 3=recurring no fixed time, 8=recurring with fixed time'
        ),
      startTime: z
        .string()
        .optional()
        .describe(
          'Meeting start time in UTC (yyyy-MM-ddTHH:mm:ssZ). Required for scheduled meetings'
        ),
      duration: z.number().optional().describe('Meeting duration in minutes'),
      timezone: z.string().optional().describe('Timezone (e.g., "America/New_York")'),
      password: z.string().optional().describe('Meeting password (max 10 characters)'),
      agenda: z.string().optional().describe('Meeting description/agenda'),
      recurrence: recurrenceSchema,
      settings: settingsSchema
    })
  )
  .output(
    z.object({
      meetingId: z.number().describe('The meeting ID'),
      topic: z.string().describe('Meeting topic'),
      startTime: z.string().optional().describe('Meeting start time'),
      duration: z.number().optional().describe('Meeting duration in minutes'),
      timezone: z.string().optional().describe('Timezone of the meeting'),
      joinUrl: z.string().describe('URL for participants to join'),
      startUrl: z.string().describe('URL for the host to start the meeting'),
      password: z.string().optional().describe('Meeting password'),
      hostEmail: z.string().optional().describe('Host email address'),
      status: z.string().optional().describe('Meeting status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);

    let meetingData: Record<string, any> = {
      topic: ctx.input.topic,
      type: ctx.input.type,
      start_time: ctx.input.startTime,
      duration: ctx.input.duration,
      timezone: ctx.input.timezone,
      password: ctx.input.password,
      agenda: ctx.input.agenda
    };

    if (ctx.input.recurrence) {
      meetingData.recurrence = {
        type: ctx.input.recurrence.type,
        repeat_interval: ctx.input.recurrence.repeatInterval,
        weekly_days: ctx.input.recurrence.weeklyDays,
        monthly_day: ctx.input.recurrence.monthlyDay,
        monthly_week: ctx.input.recurrence.monthlyWeek,
        monthly_week_day: ctx.input.recurrence.monthlyWeekDay,
        end_times: ctx.input.recurrence.endTimes,
        end_date_time: ctx.input.recurrence.endDateTime
      };
    }

    if (ctx.input.settings) {
      let s = ctx.input.settings;
      meetingData.settings = {
        host_video: s.hostVideo,
        participant_video: s.participantVideo,
        join_before_host: s.joinBeforeHost,
        mute_upon_entry: s.muteUponEntry,
        watermark: s.watermark,
        use_pmi: s.usePmi,
        approval_type: s.approvalType,
        registration_type: s.registrationType,
        audio: s.audio,
        auto_recording: s.autoRecording,
        waiting_room: s.waitingRoom,
        meeting_authentication: s.meetingAuthentication,
        alternative_hosts: s.alternativeHosts
      };

      if (s.breakoutRoom) {
        meetingData.settings.breakout_room = {
          enable: s.breakoutRoom.enable,
          rooms: s.breakoutRoom.rooms?.map(r => ({
            name: r.name,
            participants: r.participants
          }))
        };
      }
    }

    let meeting = await client.createMeeting(ctx.input.userId, meetingData);

    return {
      output: {
        meetingId: meeting.id,
        topic: meeting.topic,
        startTime: meeting.start_time,
        duration: meeting.duration,
        timezone: meeting.timezone,
        joinUrl: meeting.join_url,
        startUrl: meeting.start_url,
        password: meeting.password,
        hostEmail: meeting.host_email,
        status: meeting.status
      },
      message: `Meeting **${meeting.topic}** created successfully.\n- **Join URL:** ${meeting.join_url}\n- **Meeting ID:** ${meeting.id}`
    };
  })
  .build();
