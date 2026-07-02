import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let meetingEventSummarySchema = z.object({
  meetingEventUuid: z.string().describe('UUID of the meeting event'),
  title: z.string().nullable().optional().describe('Meeting title'),
  organizer: z.string().nullable().optional().describe('Organizer email address'),
  attendees: z.array(z.string()).optional().describe('List of attendee email addresses'),
  meetingUrl: z.string().nullable().optional().describe('URL of the meeting'),
  meetingProvider: z
    .string()
    .nullable()
    .optional()
    .describe('Meeting provider (e.g., google_meeting, teams_meeting)'),
  internal: z.boolean().optional().describe('Whether the meeting is internal'),
  direction: z
    .string()
    .nullable()
    .optional()
    .describe('Meeting direction: inbound or outbound'),
  startTime: z.string().nullable().optional().describe('ISO 8601 start time'),
  endTime: z.string().nullable().optional().describe('ISO 8601 end time'),
  owned: z.boolean().optional().describe('Whether the user owns the meeting'),
  toRecord: z.boolean().optional().describe('Whether the meeting should be recorded'),
  botScheduled: z.boolean().optional().describe('Whether the bot is scheduled'),
  botRunning: z.boolean().optional().describe('Whether the bot is currently running'),
  origin: z
    .string()
    .nullable()
    .optional()
    .describe('How the event was created: api, calendar, or manual'),
  active: z.boolean().optional().describe('Whether the meeting event is active'),
  createdAt: z.string().nullable().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('ISO 8601 last updated timestamp')
});

export let listMeetingEvents = SlateTool.create(spec, {
  name: 'List Meeting Events',
  key: 'list_meeting_events',
  description: `List meeting events in your Leexi workspace. Supports filtering by creation method, date range, and sorting. Returns meeting metadata, scheduling status, and bot status.`,
  instructions: [
    'Date filters use ISO 8601 format: YYYY-MM-DDTHH:MM:SS.000Z.',
    'Use "createdBy" to filter by how the event was created: "calendar", "manual", or "api".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      items: z.number().optional().describe('Number of items per page (1-100, default: 10)'),
      order: z
        .string()
        .optional()
        .describe(
          'Sort order: "created_at desc/asc", "start_time desc/asc", "end_time desc/asc"'
        ),
      createdBy: z
        .enum(['calendar', 'manual', 'api'])
        .optional()
        .describe('Filter by creation method'),
      dateFilter: z
        .enum(['start_time', 'end_time'])
        .optional()
        .describe('Which date field to filter on (default: start_time)'),
      from: z.string().optional().describe('Start date filter in ISO 8601 format'),
      to: z.string().optional().describe('End date filter in ISO 8601 format')
    })
  )
  .output(
    z.object({
      meetingEvents: z.array(meetingEventSummarySchema).describe('List of meeting events'),
      pagination: z.object({
        page: z.number().describe('Current page number'),
        items: z.number().describe('Items per page'),
        count: z.number().describe('Total number of meeting events')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let response = await client.listMeetingEvents(ctx.input);

    let meetingEvents = (response.data || []).map((m: any) => ({
      meetingEventUuid: m.uuid,
      title: m.title,
      organizer: m.organizer,
      attendees: m.attendees,
      meetingUrl: m.meeting_url,
      meetingProvider: m.meeting_provider,
      internal: m.internal,
      direction: m.direction,
      startTime: m.start_time,
      endTime: m.end_time,
      owned: m.owned,
      toRecord: m.to_record,
      botScheduled: m.bot_scheduled,
      botRunning: m.bot_running,
      origin: m.origin,
      active: m.active,
      createdAt: m.created_at,
      updatedAt: m.updated_at
    }));

    return {
      output: {
        meetingEvents,
        pagination: response.pagination
      },
      message: `Found **${response.pagination.count}** meeting events (page ${response.pagination.page}).`
    };
  })
  .build();
