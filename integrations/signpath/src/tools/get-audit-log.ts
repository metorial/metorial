import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignPathClient } from '../lib/client';
import { spec } from '../spec';

export let getAuditLog = SlateTool.create(spec, {
  name: 'Get Audit Log',
  key: 'get_audit_log',
  description: `Retrieve audit log events from SignPath. Choose between general events (administrative changes to users, certificates, projects, signing policies, artifact configurations) or signing request events specifically. This API is in preview.`,
  constraints: ['This API is in preview and may change.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
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
              .describe('Additional metadata about the event')
          })
        )
        .describe('List of audit log events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignPathClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      baseUrl: ctx.config.baseUrl
    });

    let events =
      ctx.input.eventCategory === 'signing_requests'
        ? await client.getSigningRequestAuditLog()
        : await client.getAuditLogEvents();

    let mapped = events.map(e => ({
      eventType: e.eventType || '',
      timestamp: e.timestamp || '',
      actor: e.metadata?.actor || '',
      metadata: e.metadata || {}
    }));

    return {
      output: { events: mapped },
      message: `Retrieved **${mapped.length}** ${ctx.input.eventCategory} audit log event(s).`
    };
  })
  .build();
