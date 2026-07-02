import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
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
      projectId: z.string().describe('Project ID to list events for'),
      errorId: z
        .string()
        .optional()
        .describe('Error ID to list events for (omit for all project events)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 30)'),
      sort: z.enum(['last_seen', 'first_seen', 'unsorted']).optional().describe('Sort field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      events: z.array(eventSummarySchema).describe('List of events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient({ token: ctx.auth.token });
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('Project ID is required.');

    let events: any[];
    if (ctx.input.errorId) {
      events = await client.listErrorEvents(projectId, ctx.input.errorId, {
        perPage: ctx.input.perPage
      });
    } else {
      events = await client.listEvents(projectId, {
        perPage: ctx.input.perPage,
        sort: ctx.input.sort,
        direction: ctx.input.direction
      });
    }

    let mapped = events.map((e: any) => ({
      eventId: e.id,
      errorId: e.error_id,
      receivedAt: e.received_at,
      exceptionClass:
        e.exception_class || e.exceptions?.[0]?.errorClass || e.exceptions?.[0]?.error_class,
      message: e.message || e.exceptions?.[0]?.message,
      context: e.context,
      severity: e.severity,
      unhandled: e.unhandled,
      appVersion: e.app?.version,
      releaseStage: e.app?.releaseStage ?? e.app?.release_stage,
      osName: e.device?.osName ?? e.device?.os_name,
      browserName: e.device?.browserName ?? e.device?.browser_name,
      userId: e.user?.id,
      userEmail: e.user?.email
    }));

    return {
      output: { events: mapped },
      message: `Found **${mapped.length}** event(s).`
    };
  })
  .build();
