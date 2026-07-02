import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/admin-client';
import { spec } from '../spec';

export let getAuditLogs = SlateTool.create(spec, {
  name: 'Get Audit Logs',
  key: 'get_audit_logs',
  description: `Retrieve audit logs for your team. Logs include events like logins, logouts, settings changes, member management, API key activity, and policy violations. Requires an Admin API key.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startTime: z
        .string()
        .optional()
        .describe(
          'Start time (ISO 8601, relative like "7d", or epoch). Defaults to 7 days ago.'
        ),
      endTime: z
        .string()
        .optional()
        .describe('End time (ISO 8601, relative like "now", or epoch). Defaults to now.'),
      eventTypes: z
        .string()
        .optional()
        .describe('Comma-separated event types to filter (e.g. "login,logout,member_added")'),
      search: z.string().optional().describe('Search term to filter events'),
      page: z.number().optional().describe('Page number (default 1)'),
      pageSize: z
        .number()
        .max(500)
        .optional()
        .describe('Results per page (default 100, max 500)'),
      users: z
        .string()
        .optional()
        .describe('Filter by user email addresses or encoded user IDs')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          eventId: z.string().describe('Unique event identifier'),
          timestamp: z.string().describe('Event timestamp'),
          ipAddress: z.string().describe('IP address of the event source'),
          userEmail: z.string().describe('Email of the user who triggered the event'),
          eventType: z.string().describe('Type of audit event'),
          eventData: z
            .record(z.string(), z.unknown())
            .describe('Additional event-specific data')
        })
      ),
      totalCount: z.number().describe('Total number of matching events'),
      totalPages: z.number().describe('Total pages available'),
      hasNextPage: z.boolean().describe('Whether more pages are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({ token: ctx.auth.token });
    let result = await client.getAuditLogs({
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      eventTypes: ctx.input.eventTypes,
      search: ctx.input.search,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      users: ctx.input.users
    });

    return {
      output: {
        events: result.events.map(e => ({
          eventId: e.event_id,
          timestamp: e.timestamp,
          ipAddress: e.ip_address,
          userEmail: e.user_email,
          eventType: e.event_type,
          eventData: e.event_data
        })),
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages,
        hasNextPage: result.pagination.hasNextPage
      },
      message: `Retrieved **${result.events.length}** audit event(s) out of ${result.pagination.totalCount} total.`
    };
  })
  .build();
