import { SlateTool } from 'slates';
import { z } from 'zod';
import { type AuditLogAction, type AuditLogActionGroup, Client } from '../lib/client';
import { spec } from '../spec';

let flattenAuditActions = (
  actions: AuditLogAction[] | Record<string, AuditLogActionGroup> | undefined
) => {
  if (!actions) return [];

  if (Array.isArray(actions)) {
    return actions.map(action => ({
      group: undefined,
      groupLabel: undefined,
      ...action
    }));
  }

  return Object.entries(actions).flatMap(([group, value]) =>
    (value.actions || []).map(action => ({
      group,
      groupLabel: value.label,
      ...action
    }))
  );
};

export let listAuditLogs = SlateTool.create(spec, {
  name: 'List Audit Logs',
  key: 'list_audit_logs',
  description: `Retrieve audit log events for a Docker Hub account (user or organization). Tracks actions like repository changes, team membership updates, and settings modifications. Available for Docker Team and Business subscriptions.`,
  instructions: [
    'Use the "from" and "to" fields to filter by date range (ISO 8601 format, e.g., "2024-01-01").',
    'Use "action" to filter by specific action type. Use the List Audit Log Actions tool to see available actions.',
    'Docker retains activity logs for 30 days in the UI, but the API can retrieve beyond that.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      account: z
        .string()
        .describe('Docker Hub account name (username or organization) to retrieve logs for.'),
      action: z
        .string()
        .optional()
        .describe('Filter by specific action type (e.g., "repo.create", "repo.delete").'),
      name: z
        .string()
        .optional()
        .describe(
          'Filter by resource name. For repository events this is the repository name.'
        ),
      actor: z
        .string()
        .optional()
        .describe('Filter by the Docker Hub username that triggered the event.'),
      from: z
        .string()
        .optional()
        .describe('Start date filter in ISO 8601 format (e.g., "2024-01-01").'),
      to: z
        .string()
        .optional()
        .describe('End date filter in ISO 8601 format (e.g., "2024-12-31").'),
      page: z.number().optional().describe('Page number for pagination.'),
      pageSize: z.number().optional().describe('Number of results per page.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of audit log events.'),
      events: z.array(
        z.object({
          account: z.string().describe('Account the event belongs to.'),
          action: z.string().describe('Action type identifier.'),
          actionDescription: z.string().describe('Human-readable description of the action.'),
          resourceName: z.string().describe('Name of the affected resource.'),
          actor: z.string().describe('Username of the actor who performed the action.'),
          timestamp: z.string().describe('ISO timestamp of the event.'),
          eventData: z
            .record(z.string(), z.unknown())
            .describe('Additional event-specific data.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.listAuditLogs(ctx.input.account, {
      action: ctx.input.action,
      name: ctx.input.name,
      actor: ctx.input.actor,
      from: ctx.input.from,
      to: ctx.input.to,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        totalCount: result.count,
        events: result.results.map(e => ({
          account: e.account,
          action: e.action,
          actionDescription: e.action_description || '',
          resourceName: e.name || '',
          actor: e.actor || '',
          timestamp: e.timestamp,
          eventData: e.data || {}
        }))
      },
      message: `Found **${result.count}** audit log events for **${ctx.input.account}**.`
    };
  })
  .build();

export let listAuditLogActions = SlateTool.create(spec, {
  name: 'List Audit Log Actions',
  key: 'list_audit_log_actions',
  description: `List all available audit log action types for a Docker Hub account. Use these action identifiers to filter audit logs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      account: z.string().describe('Docker Hub account name (username or organization).')
    })
  )
  .output(
    z.object({
      actions: z.array(
        z.object({
          actionName: z.string().describe('Action type identifier (e.g., "repo.create").'),
          description: z.string().describe('Human-readable description of the action.'),
          label: z.string().optional().describe('Human-readable label for the action.'),
          group: z.string().optional().describe('Action group key.'),
          groupLabel: z.string().optional().describe('Human-readable action group label.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.listAuditLogActions(ctx.input.account);
    let actions = flattenAuditActions(result.actions);

    return {
      output: {
        actions: actions.map(a => ({
          actionName: a.name,
          description: a.description || '',
          label: a.label,
          group: a.group,
          groupLabel: a.groupLabel
        }))
      },
      message: `Found **${actions.length}** audit log action types for **${ctx.input.account}**.`
    };
  })
  .build();
