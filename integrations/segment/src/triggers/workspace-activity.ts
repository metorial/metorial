import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let workspaceActivityTrigger = SlateTrigger.create(spec, {
  name: 'Workspace Activity',
  key: 'workspace_activity',
  description:
    '[Polling fallback] Polls for audit trail events in the Segment workspace. Captures changes to sources, destinations, tracking plans, warehouses, and other workspace resources.'
})
  .input(
    z.object({
      auditEventId: z.string().describe('Unique audit event ID'),
      eventType: z.string().describe('Type of the audit event'),
      resourceId: z.string().optional().describe('Affected resource ID'),
      resourceType: z.string().optional().describe('Affected resource type'),
      actorEmail: z.string().optional().describe('Email of the actor'),
      actorType: z.string().optional().describe('Actor type'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      auditEventId: z.string().describe('Unique audit event ID'),
      eventType: z
        .string()
        .describe('Audit event type (e.g. "source.created", "destination.updated")'),
      resourceId: z.string().optional().describe('ID of the affected resource'),
      resourceType: z.string().optional().describe('Type of the affected resource'),
      actorEmail: z.string().optional().describe('Who performed the action'),
      actorType: z.string().optional().describe('Actor type (USER, API_TOKEN, etc.)'),
      timestamp: z.string().optional().describe('When the event occurred')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SegmentClient(ctx.auth.token, ctx.config.region);

      let lastTimestamp = (ctx.state as any)?.lastTimestamp as string | undefined;
      let params: Record<string, any> = { count: 100 };
      if (lastTimestamp) {
        params.startTime = lastTimestamp;
      }

      let result = await client.listAuditEvents(params);
      let events = result?.auditEvents ?? [];

      let newLastTimestamp = lastTimestamp;
      if (events.length > 0) {
        let latestEvent = events[0];
        if (latestEvent?.timestamp) {
          newLastTimestamp = latestEvent.timestamp;
        }
      }

      let seenIds = new Set((ctx.state as any)?.seenIds ?? []);
      let newEvents = events.filter((e: any) => !seenIds.has(e.id));

      let updatedSeenIds = newEvents.map((e: any) => e.id).slice(0, 200);

      return {
        inputs: newEvents.map((e: any) => ({
          auditEventId: e.id ?? '',
          eventType: e.type ?? 'unknown',
          resourceId: e.resource?.id,
          resourceType: e.resource?.type,
          actorEmail: e.actor?.email,
          actorType: e.actor?.type,
          timestamp: e.timestamp
        })),
        updatedState: {
          lastTimestamp: newLastTimestamp,
          seenIds: updatedSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      let normalizedType = (ctx.input.eventType ?? 'unknown')
        .toLowerCase()
        .replace(/\s+/g, '_');

      return {
        type: `workspace.${normalizedType}`,
        id: ctx.input.auditEventId,
        output: {
          auditEventId: ctx.input.auditEventId,
          eventType: ctx.input.eventType,
          resourceId: ctx.input.resourceId,
          resourceType: ctx.input.resourceType,
          actorEmail: ctx.input.actorEmail,
          actorType: ctx.input.actorType,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
