import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let getAuditLogs = SlateTool.create(spec, {
  name: 'Get Audit Logs',
  key: 'get_audit_logs',
  description: `Retrieve audit logs from RudderStack for security auditing. Tracks CRUD operations on sources, destinations, connections, and transformations. Supports filtering by workspace and date range.`,
  constraints: [
    'Requires Enterprise and an organization-level Service Access Token with Admin permissions.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      afterCursor: z
        .string()
        .optional()
        .describe(
          'Opaque cursor from the previous response; keep workspace/date filters unchanged.'
        ),
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
      nextCursor: z
        .string()
        .optional()
        .describe('Use as afterCursor on the next request, with the same filters.'),
      nextOffset: z
        .number()
        .optional()
        .describe('Use as offset with nextCursor to continue within a provider page.'),
      hasMore: z.boolean().optional().describe('Whether continuation is available.'),
      total: z.number().optional().describe('Provider total when supplied.'),
      auditLogs: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of audit log entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({
      token: ctx.auth.organizationAccessToken ?? ctx.auth.token,
      region: ctx.config.region
    });
    let result = await client.getAuditLogs(ctx.input);
    return {
      output: {
        auditLogs: result.data,
        nextCursor: result.nextCursor,
        nextOffset: result.nextOffset,
        hasMore: result.hasMore,
        total: result.total
      },
      message: `Retrieved ${result.data.length} audit log entries.`
    };
  })
  .build();
