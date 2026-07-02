import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMeetings = SlateTool.create(spec, {
  name: 'List Meetings',
  key: 'list_meetings',
  description: `List the user's scheduled meetings within a given time range. Returns meeting details including attendees, time, location, and associated meeting type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z
        .string()
        .describe(
          'Start of the time range (ISO 8601 date string, e.g. "2024-01-01T00:00:00Z")'
        ),
      end: z
        .string()
        .describe('End of the time range (ISO 8601 date string, e.g. "2024-01-31T23:59:59Z")')
    })
  )
  .output(
    z.object({
      meetings: z
        .array(
          z.object({
            meetingId: z.string().optional().describe('Meeting ID'),
            subject: z.string().optional().describe('Meeting subject or title'),
            start: z.string().optional().describe('Meeting start time (ISO 8601)'),
            end: z.string().optional().describe('Meeting end time (ISO 8601)'),
            location: z.string().optional().describe('Meeting location or video link'),
            attendees: z
              .array(
                z.object({
                  name: z.string().optional(),
                  email: z.string().optional()
                })
              )
              .optional()
              .describe('List of attendees'),
            raw: z.any().optional().describe('Full meeting object')
          })
        )
        .describe('List of meetings in the given timeframe')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.listMeetings({
      start: ctx.input.start,
      end: ctx.input.end
    });

    let meetings = Array.isArray(data) ? data : data?.meetings || data?.events || [];

    let mapped = meetings.map((m: any) => ({
      meetingId: m._id || m.id,
      subject: m.subject || m.title || m.name,
      start: m.start || m.dateStart || m.startTime,
      end: m.end || m.dateEnd || m.endTime,
      location: m.location || m.where,
      attendees: (m.attendees || m.contacts || []).map((a: any) => ({
        name: a.name || a.displayName,
        email: a.email
      })),
      raw: m
    }));

    return {
      output: { meetings: mapped },
      message: `Found **${mapped.length}** meeting(s) between ${ctx.input.start} and ${ctx.input.end}.`
    };
  })
  .build();
