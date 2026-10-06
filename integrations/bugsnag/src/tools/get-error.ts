import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

export let getError = SlateTool.create(spec, {
  name: 'Get Error Details',
  key: 'get_error',
  description: `Get detailed information about a specific Bugsnag error, including its class, message, severity, status, event/user counts, and recent event history. Optionally fetch recent events and comments for the error.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID the error belongs to'),
      errorId: z.string().describe('Error ID to retrieve'),
      includeEvents: z
        .boolean()
        .optional()
        .describe('Whether to include recent events (default false)'),
      includeComments: z
        .boolean()
        .optional()
        .describe('Whether to include comments (default false)'),
      eventsPerPage: z
        .number()
        .optional()
        .describe('Number of events to include (default 5, max 100)')
    })
  )
  .output(
    z.object({
      errorId: z.string().describe('Unique identifier of the error'),
      eventsNextPageUrl: z
        .string()
        .optional()
        .describe('Next-page URL for additional events; use List Events with the same error'),
      commentsNextPageUrl: z
        .string()
        .optional()
        .describe(
          'Next-page URL for additional comments; use Manage Comments list with the same error'
        ),
      errorClass: z.string().optional().describe('Error class name'),
      message: z.string().optional().describe('Error message'),
      context: z.string().optional().describe('Context where the error occurred'),
      severity: z.string().optional().describe('Error severity'),
      status: z.string().optional().describe('Error status'),
      unhandled: z.boolean().optional().describe('Whether the error was unhandled'),
      eventsCount: z.number().optional().describe('Total event count'),
      usersCount: z.number().optional().describe('Total affected user count'),
      firstSeen: z.string().optional().describe('When the error was first seen'),
      lastSeen: z.string().optional().describe('When the error was last seen'),
      releaseStages: z.array(z.string()).optional().describe('Release stages with this error'),
      assignedCollaboratorId: z.string().optional().describe('ID of assigned collaborator'),
      recentEvents: z
        .array(
          z.object({
            eventId: z.string().describe('Event ID'),
            receivedAt: z.string().optional().describe('When the event was received'),
            severity: z.string().optional().describe('Event severity'),
            unhandled: z.boolean().optional().describe('Whether unhandled'),
            user: z.any().optional().describe('User associated with event'),
            app: z.any().optional().describe('App information'),
            device: z.any().optional().describe('Device information'),
            context: z.string().optional().describe('Event context')
          })
        )
        .optional()
        .describe('Recent events for this error'),
      comments: z
        .array(
          z.object({
            commentId: z.string().describe('Comment ID'),
            message: z.string().optional().describe('Comment text'),
            authorName: z.string().optional().describe('Comment author name'),
            authorEmail: z.string().optional().describe('Comment author email'),
            createdAt: z.string().optional().describe('When the comment was posted')
          })
        )
        .optional()
        .describe('Comments on this error'),
      url: z.string().optional().describe('API URL'),
      projectUrl: z.string().optional().describe('Dashboard URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw createApiServiceError('Project ID is required.');

    let error = await client.getError(projectId, ctx.input.errorId);

    const events = ctx.input.includeEvents
      ? await client.listErrorEvents(projectId, ctx.input.errorId, {
          perPage: ctx.input.eventsPerPage ?? 5
        })
      : undefined;
    const eventsNextPageUrl = events ? client.pageInfo.nextPageUrl : undefined;
    const comments = ctx.input.includeComments
      ? await client.listComments(projectId, ctx.input.errorId)
      : undefined;
    const commentsNextPageUrl = comments ? client.pageInfo.nextPageUrl : undefined;
    const output = {
      errorId: error.id ?? undefined,
      errorClass: error.error_class ?? undefined,
      message: error.message ?? undefined,
      context: error.context ?? undefined,
      severity: error.overridden_severity ?? error.severity ?? undefined,
      status: error.status ?? undefined,
      unhandled: error.unhandled ?? undefined,
      eventsCount: error.events ?? undefined,
      usersCount: error.users ?? undefined,
      firstSeen: error.first_seen ?? undefined,
      lastSeen: error.last_seen ?? undefined,
      releaseStages: error.release_stages ?? undefined,
      assignedCollaboratorId: error.assigned_collaborator_id ?? undefined,
      url: error.url ?? undefined,
      projectUrl: error.project_url ?? undefined,
      recentEvents: events?.map(e => ({
        eventId: e.id,
        receivedAt: e.received_at ?? undefined,
        severity: e.severity ?? undefined,
        unhandled: e.unhandled ?? undefined,
        user: e.user ?? undefined,
        app: e.app ?? undefined,
        device: e.device ?? undefined,
        context: e.context ?? undefined
      })),
      comments: comments?.map(c => ({
        commentId: c.id,
        message: c.message ?? undefined,
        authorName: c.collaborator?.name ?? undefined,
        authorEmail: c.collaborator?.email ?? undefined,
        createdAt: c.created_at ?? undefined
      })),
      eventsNextPageUrl,
      commentsNextPageUrl
    };

    return {
      output,
      message: `Error **${error.error_class}**: "${error.message}" — status: ${error.status}, severity: ${error.severity}, ${error.events ?? 0} events, ${error.users ?? 0} users affected.`
    };
  })
  .build();
