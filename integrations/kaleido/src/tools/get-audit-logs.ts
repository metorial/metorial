import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { spec } from '../spec';

export let getAuditLogs = SlateTool.create(spec, {
  name: 'Get Audit Logs',
  key: 'get_audit_logs',
  description: `Retrieve audit log entries for your organization or a specific consortium. Audit logs record resource-specific CRUD operations such as invitations issued, memberships created, nodes deleted, etc.
Use this to track changes, investigate issues, or maintain compliance records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      consortiumId: z
        .string()
        .optional()
        .describe(
          'Filter audit logs to a specific consortium. If omitted, returns organization-level logs.'
        ),
      limit: z
        .number()
        .optional()
        .default(25)
        .describe('Maximum number of log entries to return'),
      skip: z
        .number()
        .optional()
        .default(0)
        .describe('Number of entries to skip for pagination')
    })
  )
  .output(
    z.object({
      auditLogs: z
        .array(
          z.object({
            auditLogId: z.string().optional().describe('Audit log entry ID'),
            action: z
              .string()
              .optional()
              .describe('Action performed (create, update, delete, etc.)'),
            resourceType: z.string().optional().describe('Type of resource affected'),
            resourceId: z.string().optional().describe('ID of the affected resource'),
            consortiumId: z.string().optional().describe('Consortium context'),
            userId: z.string().optional().describe('User who performed the action'),
            orgId: z.string().optional().describe('Organization of the user'),
            timestamp: z.string().optional().describe('When the action occurred'),
            message: z.string().optional().describe('Human-readable description')
          })
        )
        .describe('List of audit log entries'),
      count: z.number().describe('Number of entries returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaleidoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let logs = await client.listAuditLogs({
      consortiumId: ctx.input.consortiumId,
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let mapped = (Array.isArray(logs) ? logs : []).map((l: any) => ({
      auditLogId: l._id || undefined,
      action: l.action || undefined,
      resourceType: l.resource_type || l.type || undefined,
      resourceId: l.resource_id || undefined,
      consortiumId: l.consortium_id || undefined,
      userId: l.user_id || undefined,
      orgId: l.org_id || undefined,
      timestamp: l.created_at || l.timestamp || undefined,
      message: l.message || undefined
    }));

    return {
      output: {
        auditLogs: mapped,
        count: mapped.length
      },
      message: `Retrieved **${mapped.length}** audit log entries.${ctx.input.consortiumId ? ` Filtered to consortium \`${ctx.input.consortiumId}\`.` : ''}`
    };
  })
  .build();
