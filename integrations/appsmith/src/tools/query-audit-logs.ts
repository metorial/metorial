import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryAuditLogs = SlateTool.create(spec, {
  name: 'Query Audit Logs',
  key: 'query_audit_logs',
  description: `Query audit logs from an Appsmith instance. Audit logs record notable events including application CRUD, user login/signup, query executions, datasource changes, and configuration updates. **Requires Business or Enterprise edition.**`,
  constraints: ['Only available on Appsmith Business and Enterprise editions.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .string()
        .optional()
        .describe(
          'Filter by resource type (e.g. "APPLICATION", "WORKSPACE", "DATASOURCE", "PAGE", "USER").'
        ),
      event: z
        .string()
        .optional()
        .describe('Filter by event name (e.g. "application.created", "user.login").'),
      userId: z
        .string()
        .optional()
        .describe('Filter by the ID of the user who performed the action.'),
      limit: z.number().optional().describe('Maximum number of log entries to return.'),
      sortOrder: z
        .enum(['ASC', 'DESC'])
        .optional()
        .describe('Sort order for results by timestamp.')
    })
  )
  .output(
    z.object({
      logs: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of audit log entries.'),
      totalCount: z.number().optional().describe('Total number of matching log entries.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let result = await client.queryAuditLogs({
      resourceType: ctx.input.resourceType,
      event: ctx.input.event,
      userId: ctx.input.userId,
      limit: ctx.input.limit,
      sortOrder: ctx.input.sortOrder
    });

    let logs = result?.auditLogs ?? result?.logs ?? (Array.isArray(result) ? result : []);
    let totalCount = result?.total ?? result?.totalCount ?? logs.length;

    return {
      output: {
        logs,
        totalCount
      },
      message: `Retrieved **${logs.length}** audit log entries.`
    };
  })
  .build();
