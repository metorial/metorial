import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSignPathClient } from '../lib/client';
import { spec } from '../spec';

export let getAuditLog = SlateTool.create(spec, {
  name: 'Get Audit Log',
  key: 'get_audit_log',
  description: `Retrieve audit log events from SignPath. Choose between general events (administrative changes to users, certificates, projects, signing policies, artifact configurations) or signing request events specifically. Returns one page of events; pass the nextCursor to retrieve the following page. This API is in preview.`,
  constraints: ['This API is in preview and may change.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z
        .string()
        .max(5000)
        .optional()
        .describe('Continuation cursor from the preceding page'),
      startTime: z.iso
        .datetime({ offset: true })
        .optional()
        .describe(
          'Retrieve events starting from this timestamp; omit when continuing with cursor'
        ),
      eventCategory: z
        .enum(['general', 'signing_requests'])
        .default('general')
        .describe(
          'Category of audit events to retrieve: general for administrative changes, signing_requests for signing-specific events'
        )
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventType: z.string().describe('Type of the audit event'),
            timestamp: z.string().describe('Timestamp when the event occurred'),
            actor: z.string().describe('User or entity that performed the action'),
            metadata: z
              .record(z.string(), z.unknown())
              .describe('Additional metadata about the event'),
            entityMetadata: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Metadata identifying the affected entity'),
            data: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Event-specific changes')
          })
        )
        .describe('List of audit log events'),
      nextCursor: z.string().optional().describe('Cursor for the next page, when available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSignPathClient(ctx);

    let page =
      ctx.input.eventCategory === 'signing_requests'
        ? await client.getSigningRequestAuditLog({
            cursor: ctx.input.cursor,
            startTime: ctx.input.startTime
          })
        : await client.getAuditLogEvents({
            cursor: ctx.input.cursor,
            startTime: ctx.input.startTime
          });

    let mapped = page.auditLogEvents.map(e => ({
      eventType: e.metadata.eventName,
      timestamp: e.metadata.timestamp,
      actor:
        e.metadata.actor.name ??
        e.metadata.actor.identity ??
        e.metadata.actor.id ??
        e.metadata.actor.type,
      metadata: e.metadata,
      entityMetadata: e.entityMetadata,
      data: e.data
    }));

    return {
      output: { events: mapped, nextCursor: page.pagination.nextCursor ?? undefined },
      message: `Retrieved **${mapped.length}** ${ctx.input.eventCategory} audit log event(s).`
    };
  })
  .build();
