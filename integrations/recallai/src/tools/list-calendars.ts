import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nextCursor } from '../lib/client';
import { spec } from '../spec';

let calendarSchema = z.object({
  calendarId: z.string().describe('Calendar unique identifier'),
  platform: z.string().describe('Calendar platform (google, microsoft)'),
  platformEmail: z.string().nullable().describe('Email address associated with the calendar'),
  status: z.string().describe('Calendar connection status'),
  createdAt: z.string().describe('Calendar creation timestamp')
});

export let listCalendarsTool = SlateTool.create(spec, {
  name: 'List Calendars',
  key: 'list_calendars',
  description: `List all connected calendars. Returns calendar connections with their platform, email, and connection status.`,
  constraints: ['Rate limit: 60 requests per minute per workspace.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor for next page'),
      platform: z
        .enum(['google_calendar', 'microsoft_outlook'])
        .optional()
        .describe('Calendar platform filter'),
      status: z
        .enum(['connecting', 'connected', 'disconnected'])
        .optional()
        .describe('Connection status filter'),
      email: z.string().optional().describe('Calendar email filter'),
      pageSize: z
        .number()
        .optional()
        .describe('Legacy page-size hint; Recall.ai chooses the page size')
    })
  )
  .output(
    z.object({
      totalCount: z
        .number()
        .optional()
        .describe('Provider-wide total when supplied by Recall.ai; omitted when unavailable'),
      returnedCount: z.number().optional().describe('Number of results on this page'),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      calendars: z.array(calendarSchema).describe('List of connected calendars')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listCalendars({
      cursor: ctx.input.cursor,
      platform: ctx.input.platform,
      status: ctx.input.status,
      email: ctx.input.email,
      pageSize: ctx.input.pageSize
    });

    let cursor = nextCursor(result.next);

    return {
      output: {
        totalCount: result.count,
        returnedCount: result.results.length,
        nextCursor: cursor,
        calendars: result.results.map(cal => ({
          calendarId: cal.id,
          platform: cal.platform,
          platformEmail: cal.platformEmail,
          status: cal.status,
          createdAt: cal.createdAt
        }))
      },
      message: `Retrieved ${result.results.length} results${cursor ? ' (more available)' : ''}.`
    };
  })
  .build();
