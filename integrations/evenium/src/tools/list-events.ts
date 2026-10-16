import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  dateFilterSchemas,
  eventSchema,
  pageMetadata,
  pageMetadataSchema
} from '../lib/schemas';
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
          'Legacy provider since filter (RFC 3339). Prefer the explicit start/end/creation date filters.'
        ),
      until: z
        .string()
        .optional()
        .describe(
          'Legacy provider until filter (RFC 3339). Prefer the explicit start/end/creation date filters.'
        ),
      ...dateFilterSchemas,
      firstResult: z.number().optional().describe('Offset for pagination (0-based)'),
      maxResults: z.number().optional().describe('Maximum number of results to return')
    })
  )
  .output(z.object({ events: z.array(eventSchema), ...pageMetadataSchema }))
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listEvents(ctx.input);

    let events = result.events.map(e => ({
      eventId: e.id,
      title: e.title,
      description: e.description,
      startDate: e.startDate,
      endDate: e.endDate,
      creationDate: e.creationDate,
      status: e.status,
      url: e.url,
      raw: e.raw
    }));

    return {
      output: {
        events,
        ...pageMetadata(result)
      },
      message: `Found **${events.length}** event(s)${ctx.input.title ? ` matching "${ctx.input.title}"` : ''}.`
    };
  })
  .build();
