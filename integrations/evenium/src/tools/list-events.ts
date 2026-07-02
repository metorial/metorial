import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `Retrieve a list of events from your Evenium account. Supports filtering by title, status, and date range. Use this to browse events, find specific events by criteria, or get an overview of upcoming/past events.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      title: z.string().optional().describe('Filter events by title (partial match)'),
      status: z
        .enum(['FUTURE', 'DRAFT', 'DELETED', 'CLOSED', 'ARCHIVED', 'CANCELED', 'CLONEABLE'])
        .optional()
        .describe('Filter by event status'),
      since: z
        .string()
        .optional()
        .describe(
          'Only return events created/modified since this date (RFC 3339 format, e.g. 2024-01-01T00:00:00Z)'
        ),
      until: z
        .string()
        .optional()
        .describe('Only return events created/modified until this date (RFC 3339 format)'),
      firstResult: z.number().optional().describe('Offset for pagination (0-based)'),
      maxResults: z.number().optional().describe('Maximum number of results to return')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          eventId: z.string().describe('Unique event identifier'),
          title: z.string().describe('Event title'),
          description: z.string().optional().describe('Event description'),
          startDate: z.string().describe('Event start date (RFC 3339)'),
          endDate: z.string().optional().describe('Event end date (RFC 3339)'),
          creationDate: z.string().optional().describe('Event creation date (RFC 3339)'),
          status: z.string().optional().describe('Event status'),
          url: z.string().optional().describe('Event URL')
        })
      ),
      totalCount: z.string().describe('Total number of matching events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listEvents({
      title: ctx.input.title,
      status: ctx.input.status,
      since: ctx.input.since,
      until: ctx.input.until,
      firstResult: ctx.input.firstResult,
      maxResults: ctx.input.maxResults
    });

    let events = result.events.map(e => ({
      eventId: e.id,
      title: e.title,
      description: e.description,
      startDate: e.startDate,
      endDate: e.endDate,
      creationDate: e.creationDate,
      status: e.status,
      url: e.url
    }));

    return {
      output: {
        events,
        totalCount: result.totalCount
      },
      message: `Found **${events.length}** event(s)${ctx.input.title ? ` matching "${ctx.input.title}"` : ''}.`
    };
  })
  .build();
