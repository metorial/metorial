import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAuditLogs = SlateTool.create(spec, {
  name: 'List Audit Logs',
  key: 'list_audit_logs',
  description: `Retrieve audit logs for the organization. Audit logs track actions taken by members, useful for monitoring activity and security.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (1-based)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 20)')
    })
  )
  .output(
    z.object({
      auditLogs: z.array(
        z.object({
          code: z.string().describe('Audit log event code'),
          message: z.string().describe('Description of the action'),
          origin: z.string().describe('Origin of the action'),
          author: z.string().describe('Who performed the action'),
          createdAt: z.string().describe('When the action occurred'),
          data: z.record(z.string(), z.unknown()).optional().describe('Additional event data')
        })
      ),
      pagination: z.object({
        page: z.number(),
        pageSize: z.number(),
        totalPages: z.number(),
        totalRows: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let result = await client.listAuditLogs({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let auditLogs = result.audit_logs.map(log => ({
      code: log.code,
      message: log.message,
      origin: log.origin,
      author: log.author,
      createdAt: log.created_at,
      data: log.data
    }));

    return {
      output: {
        auditLogs,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          totalPages: result.pagination.total_pages,
          totalRows: result.pagination.total_rows
        }
      },
      message: `Retrieved **${auditLogs.length}** audit log(s) (page ${result.pagination.page} of ${result.pagination.total_pages}).`
    };
  })
  .build();
