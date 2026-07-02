import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventSchema = z.object({
  eventId: z.string().describe('Event ID'),
  connectionId: z.string().describe('Connection (webhook) ID'),
  sourceId: z.string().describe('Source ID'),
  destinationId: z.string().describe('Destination ID'),
  requestId: z.string().describe('Originating request ID'),
  eventDataId: z.string().describe('Event data ID'),
  status: z.string().describe('Event status (SUCCESSFUL, FAILED, PENDING, PAUSED)'),
  attempts: z.number().describe('Number of delivery attempts'),
  responseStatus: z.number().nullable().optional().describe('Last response HTTP status code'),
  errorCode: z.string().nullable().optional().describe('Error code if failed'),
  lastAttemptAt: z
    .string()
    .nullable()
    .optional()
    .describe('Timestamp of last delivery attempt'),
  nextAttemptAt: z
    .string()
    .nullable()
    .optional()
    .describe('Timestamp of next scheduled retry'),
  createdAt: z.string().describe('Event creation timestamp')
});

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `Retrieve and inspect Hookdeck events. Events represent individual webhook deliveries through a connection. Filter by status, source, destination, connection, or date range.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().optional().describe('Get a specific event by ID'),
      status: z
        .enum(['SUCCESSFUL', 'FAILED', 'PENDING', 'PAUSED', 'QUEUED', 'HOLD', 'CANCELLED'])
        .optional()
        .describe('Filter by event status'),
      connectionId: z.string().optional().describe('Filter by connection ID'),
      sourceId: z.string().optional().describe('Filter by source ID'),
      destinationId: z.string().optional().describe('Filter by destination ID'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter events created after this ISO timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter events created before this ISO timestamp'),
      limit: z.number().optional().describe('Max results to return'),
      cursor: z.string().optional().describe('Pagination cursor'),
      orderBy: z.string().optional().describe('Field to order by (default: created_at)'),
      dir: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      event: eventSchema.optional().describe('Single event (when eventId is provided)'),
      events: z.array(eventSchema).optional().describe('List of events'),
      nextCursor: z.string().optional().describe('Next pagination cursor'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    let mapEvent = (e: any) => ({
      eventId: e.id as string,
      connectionId: e.webhook_id as string,
      sourceId: e.source_id as string,
      destinationId: e.destination_id as string,
      requestId: e.request_id as string,
      eventDataId: e.event_data_id as string,
      status: e.status as string,
      attempts: e.attempts as number,
      responseStatus: (e.response_status as number | null) ?? null,
      errorCode: (e.error_code as string | null) ?? null,
      lastAttemptAt: (e.last_attempt_at as string | null) ?? null,
      nextAttemptAt: (e.next_attempt_at as string | null) ?? null,
      createdAt: e.created_at as string
    });

    if (ctx.input.eventId) {
      let event = await client.getEvent(ctx.input.eventId);
      return {
        output: { event: mapEvent(event) },
        message: `Retrieved event \`${event.id}\` — status: **${event.status}**, attempts: ${event.attempts}.`
      };
    }

    let createdAt: Record<string, string> | undefined;
    if (ctx.input.createdAfter || ctx.input.createdBefore) {
      createdAt = {};
      if (ctx.input.createdAfter) createdAt.gte = ctx.input.createdAfter;
      if (ctx.input.createdBefore) createdAt.lte = ctx.input.createdBefore;
    }

    let result = await client.listEvents({
      status: ctx.input.status,
      webhook_id: ctx.input.connectionId,
      source_id: ctx.input.sourceId,
      destination_id: ctx.input.destinationId,
      created_at: createdAt,
      limit: ctx.input.limit,
      next: ctx.input.cursor,
      order_by: ctx.input.orderBy,
      dir: ctx.input.dir
    });

    return {
      output: {
        events: result.models.map(e => mapEvent(e)),
        totalCount: result.count,
        nextCursor: result.pagination.next
      },
      message: `Listed **${result.models.length}** events (${result.count} total).`
    };
  })
  .build();
