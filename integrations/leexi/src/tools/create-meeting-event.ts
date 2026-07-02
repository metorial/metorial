import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMeetingEvent = SlateTool.create(spec, {
  name: 'Create Meeting Event',
  key: 'create_meeting_event',
  description: `Create a new meeting event in Leexi. The Leexi assistant will join the meeting at the scheduled time if recording is enabled. Supports Zoom, Google Meet, and Microsoft Teams meetings.`,
  instructions: [
    'The "userUuid" must be a valid, licensed Leexi user. Use "List Users" to find available UUIDs.',
    'Set "toRecord" to true to have the Leexi bot join and record the meeting.',
    'Dates must be in ISO 8601 format: YYYY-MM-DDTHH:MM:SS.000Z.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      meetingUrl: z
        .string()
        .describe('URL of the meeting (Zoom, Google Meet, or Microsoft Teams)'),
      userUuid: z.string().describe('UUID of the Leexi user associated with the meeting'),
      startTime: z.string().describe('Meeting start time in ISO 8601 format'),
      endTime: z.string().describe('Meeting end time in ISO 8601 format'),
      organizer: z.string().describe('Email address of the meeting organizer'),
      toRecord: z.boolean().describe('Whether the Leexi bot should record the meeting'),
      attendees: z
        .array(z.string())
        .optional()
        .describe('Email addresses of meeting attendees'),
      title: z.string().optional().describe('Title of the meeting'),
      description: z.string().optional().describe('Description of the meeting'),
      owned: z
        .boolean()
        .optional()
        .describe('Whether the user owns the meeting (default: false)'),
      internal: z
        .boolean()
        .optional()
        .describe('Whether the meeting is internal (default: false)'),
      direction: z.enum(['inbound', 'outbound']).optional().describe('Meeting direction')
    })
  )
  .output(
    z.object({
      meetingEventUuid: z.string().describe('UUID of the created meeting event'),
      title: z.string().nullable().optional().describe('Title of the meeting'),
      meetingUrl: z.string().nullable().optional().describe('Meeting URL'),
      meetingProvider: z.string().nullable().optional().describe('Detected meeting provider'),
      startTime: z.string().nullable().optional().describe('ISO 8601 start time'),
      endTime: z.string().nullable().optional().describe('ISO 8601 end time'),
      botScheduled: z.boolean().optional().describe('Whether the bot is scheduled to join'),
      active: z.boolean().optional().describe('Whether the event is active')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let response = await client.createMeetingEvent(ctx.input);
    let m = response.data || response;

    return {
      output: {
        meetingEventUuid: m.uuid,
        title: m.title,
        meetingUrl: m.meeting_url,
        meetingProvider: m.meeting_provider,
        startTime: m.start_time,
        endTime: m.end_time,
        botScheduled: m.bot_scheduled,
        active: m.active
      },
      message: `Created meeting event **${m.title || m.uuid}** scheduled for ${m.start_time}.`
    };
  })
  .build();
