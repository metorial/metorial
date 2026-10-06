import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageMap } from '../lib/schemas';
import { clientConfig } from '../lib/validation';
import { spec } from '../spec';

let auditLogEntrySchema = z.object({
  logId: z.string().describe('Unique ID of the audit log entry'),
  type: z
    .string()
    .describe('Event type (e.g. ENVELOPE_ITEM_CREATED, EMAIL_SENT, DOCUMENT_COMPLETED)'),
  createdAt: z.string().describe('ISO timestamp of the event'),
  userAgent: z.string().optional().describe('User agent string'),
  ipAddress: z.string().optional().describe('IP address of the actor'),
  name: z.string().optional().describe('Name of the actor'),
  email: z.string().optional().describe('Email of the actor')
});

export let getAuditLogTool = SlateTool.create(spec, {
  name: 'Get Audit Log',
  key: 'get_audit_log',
  description: `Retrieve the audit log for an envelope, showing all actions taken (creation, sends, opens, signatures, completions, etc.). Useful for compliance and tracking document activity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope to get audit logs for'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Results per page (1-100)')
    })
  )
  .output(
    z.object({
      entries: z.array(auditLogEntrySchema).describe('Audit log entries'),
      totalCount: z.number().optional(),
      currentPage: z.number().optional(),
      perPage: z.number().optional(),
      totalPages: z.number().optional(),
      nextPage: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const r = await new Client(clientConfig(ctx)).getEnvelopeAuditLog(
      ctx.input.envelopeId,
      ctx.input
    );
    return {
      output: {
        entries: r.data.map(e => ({
          logId: e.id,
          type: e.type,
          createdAt: e.createdAt,
          userAgent: e.userAgent ?? undefined,
          ipAddress: e.ipAddress ?? undefined,
          name: e.name ?? undefined,
          email: e.email ?? undefined
        })),
        ...pageMap(r)
      },
      message: `Retrieved ${r.data.length} audit entries on this page.`
    };
  })
  .build();
