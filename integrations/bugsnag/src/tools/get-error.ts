import { SlateTool } from 'slates';
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
        .describe('Number of events to include (default 5, max 30)')
    })
  )
  .output(
    z.object({
      errorId: z.string().describe('Unique identifier of the error'),
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
    let client = new BugsnagClient({ token: ctx.auth.token });
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('Project ID is required.');

    let error = await client.getError(projectId, ctx.input.errorId);

    let output: any = {
      errorId: error.id,
      errorClass: error.error_class,
      message: error.message,
      context: error.context,
      severity: error.severity,
      status: error.status,
      unhandled: error.unhandled,
      eventsCount: error.events,
      usersCount: error.users,
      firstSeen: error.first_seen,
      lastSeen: error.last_seen,
      releaseStages: error.release_stages,
      assignedCollaboratorId: error.assigned_collaborator_id,
      url: error.url,
      projectUrl: error.project_url
    };

    if (ctx.input.includeEvents) {
      let events = await client.listErrorEvents(projectId, ctx.input.errorId, {
        perPage: ctx.input.eventsPerPage || 5
      });

      output.recentEvents = events.map((e: any) => ({
        eventId: e.id,
        receivedAt: e.received_at,
        severity: e.severity,
        unhandled: e.unhandled,
        user: e.user,
        app: e.app,
        device: e.device,
        context: e.context
      }));
    }

    if (ctx.input.includeComments) {
      let comments = await client.listComments(projectId, ctx.input.errorId);
      output.comments = comments.map((c: any) => ({
        commentId: c.id,
        message: c.message,
        authorName: c.author?.name,
        authorEmail: c.author?.email,
        createdAt: c.created_at
      }));
    }

    return {
      output,
      message: `Error **${error.error_class}**: "${error.message}" — status: ${error.status}, severity: ${error.severity}, ${error.events ?? 0} events, ${error.users ?? 0} users affected.`
    };
  })
  .build();
