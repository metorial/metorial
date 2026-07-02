import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let getAuditLogs = SlateTool.create(spec, {
  name: 'Get Audit Logs',
  key: 'get_audit_logs',
  description: `Retrieve audit logs from RudderStack for security auditing. Tracks CRUD operations on sources, destinations, connections, and transformations. Supports filtering by workspace and date range.`,
  constraints: ['Available only on the Enterprise plan.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().optional().describe('Filter by workspace ID'),
      startDate: z
        .string()
        .optional()
        .describe('Start date for log filtering (ISO 8601 format)'),
      endDate: z.string().optional().describe('End date for log filtering (ISO 8601 format)'),
      limit: z.number().optional().describe('Maximum number of logs to return'),
      offset: z.number().optional().describe('Number of logs to skip')
    })
  )
  .output(
    z.object({
      auditLogs: z.array(z.record(z.string(), z.any())).describe('List of audit log entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getAuditLogs({
      workspaceId: ctx.input.workspaceId,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let logs = result.auditLogs || result.logs || result;

    return {
      output: { auditLogs: Array.isArray(logs) ? logs : [] },
      message: `Retrieved **${Array.isArray(logs) ? logs.length : 0}** audit log entries.`
    };
  })
  .build();
