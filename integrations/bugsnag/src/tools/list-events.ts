import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient, filtersSchema } from '../lib/client';
import { pageInput, pageOutput } from '../lib/schemas';
import type { Event } from '../lib/types';
import { spec } from '../spec';

let eventSummarySchema = z.object({
  eventId: z.string().describe('Unique identifier of the event'),
  errorId: z.string().optional().describe('Parent error ID'),
  receivedAt: z.string().optional().describe('When the event was received'),
  exceptionClass: z.string().optional().describe('Exception class name'),
  message: z.string().optional().describe('Error message'),
  context: z.string().optional().describe('Error context'),
  severity: z.string().optional().describe('Event severity'),
  unhandled: z.boolean().optional().describe('Whether unhandled'),
  appVersion: z.string().optional().describe('App version'),
  releaseStage: z.string().optional().describe('Release stage'),
  osName: z.string().optional().describe('OS name'),
  browserName: z.string().optional().describe('Browser name'),
  userId: z.string().optional().describe('User ID'),
  userEmail: z.string().optional().describe('User email')
});

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List error events for a project or specific error. Events are individual occurrences of an error. Use this to browse recent crash/error occurrences and identify patterns.`,
  instructions: [
    'Provide errorId to list events for a specific error group, or omit it to list all project events.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...pageInput,
      filters: filtersSchema
        .optional()
        .describe('Event-field filters, each containing comparison type and value.'),
      projectId: z.string().describe('Project ID to list events for'),
      errorId: z
        .string()
        .optional()
        .describe('Error ID to list events for (omit for all project events)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 30)'),
      sort: z
        .enum(['last_seen', 'first_seen', 'unsorted', 'timestamp'])
        .optional()
        .describe(
          'Use timestamp. Legacy last_seen, first_seen, and unsorted values are treated as timestamp.'
        ),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      ...pageOutput,
      events: z.array(eventSummarySchema).describe('List of events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw createApiServiceError('Project ID is required.');

    let events: Event[];
    if (ctx.input.errorId) {
      events = await client.listErrorEvents(projectId, ctx.input.errorId, {
        perPage: ctx.input.perPage,
        pageUrl: ctx.input.pageUrl,
        sort: 'timestamp',
        direction: ctx.input.direction,
        filters: ctx.input.filters
      });
    } else {
      events = await client.listEvents(projectId, {
        perPage: ctx.input.perPage,
        pageUrl: ctx.input.pageUrl,
        sort: 'timestamp',
        direction: ctx.input.direction,
        filters: ctx.input.filters
      });
    }

    let mapped = events.map(e => ({
      eventId: e.id ?? undefined,
      errorId: e.error_id ?? undefined,
      receivedAt: e.received_at ?? undefined,
      exceptionClass: e.error_class ?? e.exceptions?.[0]?.errorClass,
      message: e.message ?? e.exceptions?.[0]?.message,
      context: e.context ?? undefined,
      severity: e.severity ?? undefined,
      unhandled: e.unhandled ?? undefined,
      appVersion: e.app?.version ?? undefined,
      releaseStage: e.app?.releaseStage ?? undefined,
      osName: e.device?.osName ?? undefined,
      browserName: e.device?.browserName ?? undefined,
      userId: e.user?.id ?? undefined,
      userEmail: e.user?.email ?? undefined
    }));

    return {
      output: { events: mapped, ...client.pageInfo },
      message: `Found **${mapped.length}** event(s).`
    };
  })
  .build();
