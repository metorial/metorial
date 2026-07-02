import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `Query historical events from your OneLogin account for audit logging, compliance, and reporting. Filter by event type, user, date range, and other attributes. Returns events with actor, target, app, and risk information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventTypeId: z
        .number()
        .optional()
        .describe('Filter by event type ID (use Get Event Types to find IDs)'),
      userId: z.number().optional().describe('Filter by target user ID'),
      since: z.string().optional().describe('ISO8601 start time for the date range'),
      until: z.string().optional().describe('ISO8601 end time for the date range'),
      clientId: z
        .string()
        .optional()
        .describe('Filter by API client ID that generated the event'),
      directoryId: z.number().optional().describe('Filter by directory ID'),
      resolution: z.string().optional().describe('Filter by event resolution'),
      limit: z.number().optional().describe('Number of results per page (max 50)')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventId: z.number().describe('Event ID'),
            eventTypeId: z.number().describe('Event type ID'),
            createdAt: z.string().nullable().optional().describe('ISO8601 timestamp'),
            userId: z.number().nullable().optional().describe('Target user ID'),
            userName: z.string().nullable().optional().describe('Target user name'),
            actorUserId: z.number().nullable().optional().describe('Actor user ID'),
            actorUserName: z.string().nullable().optional().describe('Actor user name'),
            appId: z.number().nullable().optional().describe('Related app ID'),
            appName: z.string().nullable().optional().describe('Related app name'),
            ipaddr: z.string().nullable().optional().describe('IP address'),
            roleId: z.number().nullable().optional().describe('Related role ID'),
            roleName: z.string().nullable().optional().describe('Related role name'),
            groupId: z.number().nullable().optional().describe('Related group ID'),
            groupName: z.string().nullable().optional().describe('Related group name'),
            customMessage: z.string().nullable().optional().describe('Custom event message'),
            notes: z.string().nullable().optional().describe('Event notes'),
            errorDescription: z
              .string()
              .nullable()
              .optional()
              .describe('Error description if applicable'),
            riskScore: z
              .number()
              .nullable()
              .optional()
              .describe('Risk score (when Adaptive Auth is enabled)')
          })
        )
        .describe('List of events'),
      afterCursor: z
        .string()
        .nullable()
        .optional()
        .describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let params: Record<string, string | number | undefined> = {};
    if (ctx.input.eventTypeId) params.event_type_id = ctx.input.eventTypeId;
    if (ctx.input.userId) params.user_id = ctx.input.userId;
    if (ctx.input.since) params.since = ctx.input.since;
    if (ctx.input.until) params.until = ctx.input.until;
    if (ctx.input.clientId) params.client_id = ctx.input.clientId;
    if (ctx.input.directoryId) params.directory_id = ctx.input.directoryId;
    if (ctx.input.resolution) params.resolution = ctx.input.resolution;
    if (ctx.input.limit) params.limit = ctx.input.limit;

    let response = await client.listEvents(params);
    let events = response.data || [];

    let mapped = events.map((e: any) => ({
      eventId: e.id,
      eventTypeId: e.event_type_id,
      createdAt: e.created_at,
      userId: e.user_id,
      userName: e.user_name,
      actorUserId: e.actor_user_id,
      actorUserName: e.actor_user_name,
      appId: e.app_id,
      appName: e.app_name,
      ipaddr: e.ipaddr,
      roleId: e.role_id,
      roleName: e.role_name,
      groupId: e.group_id,
      groupName: e.group_name,
      customMessage: e.custom_message,
      notes: e.notes,
      errorDescription: e.error_description,
      riskScore: e.risk_score
    }));

    return {
      output: {
        events: mapped,
        afterCursor: response.pagination?.after_cursor || null
      },
      message: `Found **${mapped.length}** event(s).`
    };
  });
