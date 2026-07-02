import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAuditLogs = SlateTool.create(spec, {
  name: 'List Audit Logs',
  key: 'list_audit_logs',
  description: `List audit log entries for the organization. Filter by action type, actor, or date range for compliance and security tracking.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z.string().optional().describe('Filter by action type'),
      actorId: z.string().optional().describe('Filter by actor ID'),
      since: z.string().optional().describe('Start date filter (ISO 8601)'),
      until: z.string().optional().describe('End date filter (ISO 8601)'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      auditLogs: z.array(z.any()),
      currentPage: z.number(),
      nextPage: z.number().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let result = await client.listAuditLogs(
      { page: ctx.input.page, perPage: ctx.input.perPage },
      {
        action: ctx.input.action,
        actorId: ctx.input.actorId,
        since: ctx.input.since,
        until: ctx.input.until
      }
    );

    return {
      output: {
        auditLogs: result.data,
        currentPage: result.currentPage,
        nextPage: result.nextPage
      },
      message: `Found **${result.data.length}** audit log entry(ies) on page ${result.currentPage}.`
    };
  });
