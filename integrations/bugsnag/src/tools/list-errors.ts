import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient, filtersSchema } from '../lib/client';
import { pageInput, pageOutput } from '../lib/schemas';
import type { Filters } from '../lib/types';
import { spec } from '../spec';

let errorSchema = z.object({
  errorId: z.string().describe('Unique identifier of the error'),
  errorClass: z
    .string()
    .optional()
    .describe('Error class name (e.g., TypeError, NullPointerException)'),
  message: z.string().optional().describe('Error message'),
  context: z
    .string()
    .optional()
    .describe('Context where the error occurred (e.g., controller#action)'),
  severity: z.string().optional().describe('Error severity: error, warning, or info'),
  status: z.string().optional().describe('Error status: open, fixed, snoozed, or ignored'),
  unhandled: z.boolean().optional().describe('Whether the error was unhandled'),
  eventsCount: z.number().optional().describe('Total number of events for this error'),
  usersCount: z.number().optional().describe('Number of users affected'),
  firstSeen: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp when the error was first seen'),
  lastSeen: z.string().optional().describe('ISO 8601 timestamp when the error was last seen'),
  releaseStages: z
    .array(z.string())
    .optional()
    .describe('Release stages where this error has occurred'),
  assignedCollaboratorId: z.string().optional().describe('ID of the assigned collaborator'),
  url: z.string().optional().describe('API URL for this error'),
  projectUrl: z.string().optional().describe('Dashboard URL for this error')
});

export let listErrors = SlateTool.create(spec, {
  name: 'List Errors',
  key: 'list_errors',
  description: `List and search errors in a Bugsnag project. Supports filtering by status, severity, release stage, error class, and more. Returns error summaries including event/user counts and timestamps.`,
  instructions: [
    'Use the filters parameter to narrow results. Common filter keys: error.status, event.severity, app.release_stage, event.since, event.before.',
    'When paginating with filters, set sort to "unsorted" to avoid errors.'
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
        .describe(
          'Additional event-field filters. Discover keys with List Event Fields; each key maps to comparisons with type and value.'
        ),
      projectId: z.string().describe('Project ID to list errors for'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 30)'),
      sort: z
        .enum(['last_seen', 'first_seen', 'users', 'events', 'unsorted'])
        .optional()
        .describe('Sort field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      status: z
        .enum(['open', 'fixed', 'snoozed', 'ignored'])
        .optional()
        .describe('Filter by error status'),
      severity: z.enum(['error', 'warning', 'info']).optional().describe('Filter by severity'),
      releaseStage: z
        .string()
        .optional()
        .describe('Filter by release stage (e.g., production, staging)'),
      errorClass: z.string().optional().describe('Filter by error class name'),
      search: z.string().optional().describe('Substring to match in event messages'),
      since: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to filter events after this time'),
      before: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to filter events before this time')
    })
  )
  .output(
    z.object({
      ...pageOutput,
      errors: z.array(errorSchema).describe('List of errors matching the filters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw createApiServiceError('Project ID is required.');

    let filters: Filters = { ...ctx.input.filters };
    if (ctx.input.status) filters['error.status'] = [{ type: 'eq', value: ctx.input.status }];
    if (ctx.input.severity)
      filters['event.severity'] = [{ type: 'eq', value: ctx.input.severity }];
    if (ctx.input.releaseStage)
      filters['app.release_stage'] = [{ type: 'eq', value: ctx.input.releaseStage }];
    if (ctx.input.errorClass)
      filters['event.class'] = [{ type: 'eq', value: ctx.input.errorClass }];
    if (ctx.input.search) filters['event.message'] = [{ type: 'eq', value: ctx.input.search }];
    if (ctx.input.since) filters['event.since'] = [{ type: 'eq', value: ctx.input.since }];
    if (ctx.input.before) filters['event.before'] = [{ type: 'eq', value: ctx.input.before }];

    let errors = await client.listErrors(projectId, {
      perPage: ctx.input.perPage,
      pageUrl: ctx.input.pageUrl,
      sort: ctx.input.sort,
      direction: ctx.input.direction,
      filters: Object.keys(filters).length > 0 ? filters : undefined
    });

    let mapped = errors.map(e => ({
      errorId: e.id ?? undefined,
      errorClass: e.error_class ?? undefined,
      message: e.message ?? undefined,
      context: e.context ?? undefined,
      severity: e.overridden_severity ?? e.severity ?? undefined,
      status: e.status ?? undefined,
      unhandled: e.unhandled ?? undefined,
      eventsCount: e.events ?? undefined,
      usersCount: e.users ?? undefined,
      firstSeen: e.first_seen ?? undefined,
      lastSeen: e.last_seen ?? undefined,
      releaseStages: e.release_stages ?? undefined,
      assignedCollaboratorId: e.assigned_collaborator_id ?? undefined,
      url: e.url ?? undefined,
      projectUrl: e.project_url ?? undefined
    }));

    return {
      output: { errors: mapped, ...client.pageInfo },
      message: `Found **${mapped.length}** error(s) in the project.`
    };
  })
  .build();
