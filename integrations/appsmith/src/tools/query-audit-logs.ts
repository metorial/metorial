import { SlateTool } from 'slates';
import { z } from 'zod';
import { unsupportedAudit } from '../lib/validation';
import { spec } from '../spec';

export let queryAuditLogs = SlateTool.create(spec, {
  name: 'Query Audit Logs',
  key: 'query_audit_logs',
  description: `DEPRECATED — the historical audit-log route and filters are not verified against the current enterprise API contract. Use Admin Settings > Others > Audit logs on a Business instance`,
  constraints: ['Only available on Appsmith Business and Enterprise editions.'],
  tags: {
    readOnly: true,
    deprecated: true
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
  .handleInvocation(async () => {
    throw unsupportedAudit();
  })
  .build();
