import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let botRunSchema = z.object({
  botRunUuid: z.string().optional().describe('UUID of the bot run'),
  startTime: z.string().nullable().optional().describe('ISO 8601 bot run start time'),
  endTime: z.string().nullable().optional().describe('ISO 8601 bot run end time'),
  recordingStartTime: z
    .string()
    .nullable()
    .optional()
    .describe('ISO 8601 recording start time'),
  endReason: z.string().nullable().optional().describe('Reason the bot run ended')
});

export let getMeetingEvent = SlateTool.create(spec, {
  name: 'Get Meeting Event',
  key: 'get_meeting_event',
  description: `Get detailed information about a specific meeting event by UUID. Returns full meeting details including organizer, attendees, scheduling, bot run history, and recording status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      meetingEventUuid: z.string().describe('UUID of the meeting event to retrieve')
    })
  )
  .output(
    z.object({
      meetingEventUuid: z.string().describe('UUID of the meeting event'),
      title: z.string().nullable().optional().describe('Meeting title'),
      organizer: z.string().nullable().optional().describe('Organizer email address'),
      attendees: z.array(z.string()).optional().describe('Attendee email addresses'),
      meetingUrl: z.string().nullable().optional().describe('URL of the meeting'),
      meetingProvider: z.string().nullable().optional().describe('Meeting provider'),
      internal: z.boolean().optional().describe('Whether the meeting is internal'),
      direction: z.string().nullable().optional().describe('Meeting direction'),
      startTime: z.string().nullable().optional().describe('ISO 8601 start time'),
      endTime: z.string().nullable().optional().describe('ISO 8601 end time'),
      description: z.string().nullable().optional().describe('Meeting description'),
      owned: z.boolean().optional().describe('Whether the user owns the meeting'),
      toRecord: z.boolean().optional().describe('Whether the meeting should be recorded'),
      botScheduled: z.boolean().optional().describe('Whether the bot is scheduled'),
      botRunning: z.boolean().optional().describe('Whether the bot is currently running'),
      botRuns: z
        .array(botRunSchema)
        .optional()
        .describe('History of bot runs for this meeting'),
      origin: z.string().nullable().optional().describe('How the event was created'),
      active: z.boolean().optional().describe('Whether the event is active'),
      recordingNotified: z
        .boolean()
        .optional()
        .describe('Whether recording notification was sent'),
      createdAt: z.string().nullable().optional().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('ISO 8601 last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let response = await client.getMeetingEvent(ctx.input.meetingEventUuid);
    let m = response.data || response;

    return {
      output: {
        meetingEventUuid: m.uuid,
        title: m.title,
        organizer: typeof m.organizer === 'object' ? m.organizer?.email : m.organizer,
        attendees: (m.attendees || []).map((a: any) => (typeof a === 'object' ? a.email : a)),
        meetingUrl: m.meeting_url,
        meetingProvider: m.meeting_provider,
        internal: m.internal,
        direction: m.direction,
        startTime: m.start_time,
        endTime: m.end_time,
        description: m.description,
        owned: m.owned,
        toRecord: m.to_record,
        botScheduled: m.bot_scheduled,
        botRunning: m.bot_running,
        botRuns: (m.bot_runs || []).map((br: any) => ({
          botRunUuid: br.uuid,
          startTime: br.start_time,
          endTime: br.end_time,
          recordingStartTime: br.recording_start_time,
          endReason: br.end_reason
        })),
        origin: m.origin,
        active: m.active,
        recordingNotified: m.recording_notified,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      },
      message: `Retrieved meeting event **${m.title || m.uuid}** (${m.start_time || 'no start time'}).`
    };
  })
  .build();
