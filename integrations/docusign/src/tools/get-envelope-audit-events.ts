import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let auditFieldSchema = z.object({
  name: z.string().optional(),
  value: z.string().optional()
});

let auditEventSchema = z.object({
  eventName: z.string().optional(),
  eventDateTime: z.string().optional(),
  userName: z.string().optional(),
  userId: z.string().optional(),
  status: z.string().optional(),
  envelopeId: z.string().optional(),
  eventFields: z.array(auditFieldSchema).optional()
});

export let getEnvelopeAuditEvents = SlateTool.create(spec, {
  name: 'Get Envelope Audit Events',
  key: 'get_envelope_audit_events',
  description: `Retrieves DocuSign audit events for a specific envelope, including envelope lifecycle and recipient activity records used for compliance review.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope whose audit events to retrieve')
    })
  )
  .output(
    z.object({
      envelopeId: z.string().describe('ID of the envelope'),
      eventCount: z.number().describe('Number of audit events returned'),
      auditEvents: z.array(auditEventSchema).describe('Audit events for the envelope')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUri: ctx.auth.baseUri,
      accountId: ctx.auth.accountId
    });

    let result = await client.getAuditEvents(ctx.input.envelopeId);
    let auditEvents = (result.auditEvents || result.events || []).map((event: any) => ({
      eventName: event.eventName,
      eventDateTime: event.eventDateTime,
      userName: event.userName,
      userId: event.userId,
      status: event.status,
      envelopeId: event.envelopeId,
      eventFields: event.eventFields?.map((field: any) => ({
        name: field.name,
        value: field.value
      }))
    }));

    return {
      output: {
        envelopeId: ctx.input.envelopeId,
        eventCount: auditEvents.length,
        auditEvents
      },
      message: `Retrieved **${auditEvents.length}** audit event(s) for envelope **${ctx.input.envelopeId}**.`
    };
  })
  .build();
