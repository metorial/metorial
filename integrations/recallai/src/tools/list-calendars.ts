import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
  constraints: ['Rate limit: 300 requests per minute per workspace.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor for next page'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of calendars'),
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
      pageSize: ctx.input.pageSize
    });

    let nextCursor: string | null = null;
    if (result.next) {
      try {
        let url = new URL(result.next);
        nextCursor = url.searchParams.get('cursor');
      } catch {
        nextCursor = result.next;
      }
    }

    return {
      output: {
        totalCount: result.count,
        nextCursor,
        calendars: result.results.map(cal => ({
          calendarId: cal.id,
          platform: cal.platform,
          platformEmail: cal.platformEmail,
          status: cal.status,
          createdAt: cal.createdAt
        }))
      },
      message: `Found **${result.count}** connected calendars.`
    };
  })
  .build();
