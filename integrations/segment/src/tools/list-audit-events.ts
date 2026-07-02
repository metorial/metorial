import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let listAuditEvents = SlateTool.create(spec, {
  name: 'List Audit Events',
  key: 'list_audit_events',
  description: `List audit trail events for the workspace. Audit events record actions like source creation, destination updates, user invitations, and other workspace changes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startTime: z.string().optional().describe('ISO 8601 start time filter'),
      endTime: z.string().optional().describe('ISO 8601 end time filter'),
      resourceId: z.string().optional().describe('Filter by specific resource ID'),
      resourceType: z
        .string()
        .optional()
        .describe('Filter by resource type (e.g. "SOURCE", "DESTINATION")'),
      count: z.number().optional().describe('Number of events per page')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            auditEventId: z.string().describe('Audit event ID'),
            eventType: z.string().optional().describe('Type of audit event'),
            resourceId: z.string().optional().describe('Affected resource ID'),
            resourceType: z.string().optional().describe('Affected resource type'),
            actorEmail: z
              .string()
              .optional()
              .describe('Email of the actor who performed the action'),
            actorType: z.string().optional().describe('Actor type (USER, API_TOKEN, etc.)'),
            timestamp: z.string().optional().describe('When the event occurred')
          })
        )
        .describe('Audit events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);
    let result = await client.listAuditEvents({
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      resourceId: ctx.input.resourceId,
      resourceType: ctx.input.resourceType,
      count: ctx.input.count
    });

    let events = (result?.auditEvents ?? []).map((e: any) => ({
      auditEventId: e.id,
      eventType: e.type,
      resourceId: e.resource?.id,
      resourceType: e.resource?.type,
      actorEmail: e.actor?.email,
      actorType: e.actor?.type,
      timestamp: e.timestamp
    }));

    return {
      output: { events },
      message: `Found **${events.length}** audit events`
    };
  })
  .build();
