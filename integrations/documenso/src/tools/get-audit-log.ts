import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      entries: z.array(auditLogEntrySchema).describe('Audit log entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getEnvelopeAuditLog(ctx.input.envelopeId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let items = Array.isArray(result) ? result : (result.data ?? result.logs ?? []);

    return {
      output: {
        entries: items.map((entry: Record<string, unknown>) => ({
          logId: String(entry.id ?? ''),
          type: String(entry.type ?? ''),
          createdAt: String(entry.createdAt ?? ''),
          userAgent: entry.userAgent ? String(entry.userAgent) : undefined,
          ipAddress: entry.ipAddress ? String(entry.ipAddress) : undefined,
          name: entry.name ? String(entry.name) : undefined,
          email: entry.email ? String(entry.email) : undefined
        }))
      },
      message: `Retrieved ${items.length} audit log entries for envelope \`${ctx.input.envelopeId}\`.`
    };
  })
  .build();
