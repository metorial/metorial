import { SlateTool } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let getAuditLogs = SlateTool.create(spec, {
  name: 'Get Audit Logs',
  key: 'get_audit_logs',
  description: `Retrieve activity logs for a database connection. Supports filtering by table name, user, and date range. Also supports fetching sign-in audit logs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().optional().describe('Connection ID for connection-level logs'),
      logType: z
        .enum(['connection', 'signin'])
        .default('connection')
        .describe('Type of audit log to retrieve'),
      tableName: z.string().optional().describe('Filter logs by table name'),
      userId: z.string().optional().describe('Filter logs by user ID'),
      dateFrom: z.string().optional().describe('Start date filter (ISO 8601 format)'),
      dateTo: z.string().optional().describe('End date filter (ISO 8601 format)'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of log entries per page')
    })
  )
  .output(
    z.object({
      logs: z.array(z.record(z.string(), z.unknown())).describe('Audit log entries'),
      pagination: z
        .object({
          total: z.number().optional(),
          page: z.number().optional(),
          perPage: z.number().optional()
        })
        .optional()
        .describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RocketadminClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.logType === 'signin') {
      let logs = await client.getSignInAuditLogs();
      return {
        output: { logs },
        message: `Retrieved **${logs.length}** sign-in audit log entries.`
      };
    }

    if (!ctx.input.connectionId) {
      throw new Error('connectionId is required for connection logs');
    }

    let result = await client.getConnectionLogs(ctx.input.connectionId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      tableName: ctx.input.tableName,
      userId: ctx.input.userId,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo
    });

    let logs = Array.isArray(result)
      ? result
      : (result.logs as Record<string, unknown>[]) || [];
    let pagination = !Array.isArray(result)
      ? {
          total: result.total_count as number | undefined,
          page: ctx.input.page,
          perPage: ctx.input.perPage
        }
      : undefined;

    return {
      output: { logs, pagination },
      message: `Retrieved **${logs.length}** audit log entries for connection **${ctx.input.connectionId}**.`
    };
  })
  .build();
