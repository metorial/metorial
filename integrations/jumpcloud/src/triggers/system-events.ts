import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let systemEvents = SlateTrigger.create(spec, {
  name: 'System & MDM Events',
  key: 'system_events',
  description:
    'Polls JumpCloud Directory Insights for system-level and MDM events including agent activity, policy application results, command execution, device enrollment, and software changes.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      eventType: z.string().describe('Event type'),
      timestamp: z.string().describe('Event timestamp'),
      service: z.string().describe('Service category (systems or mdm)'),
      initiatedById: z.string().optional().describe('Actor ID'),
      initiatedByType: z.string().optional().describe('Actor type'),
      resourceId: z.string().optional().describe('Affected system ID'),
      resourceType: z.string().optional().describe('Resource type'),
      organization: z.string().optional().describe('Organization ID'),
      rawEvent: z.any().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      eventType: z.string().describe('Event type'),
      timestamp: z.string().describe('Event timestamp'),
      service: z.string().describe('Service category'),
      systemId: z.string().optional().describe('Affected system ID'),
      initiatedById: z.string().optional().describe('Actor ID'),
      initiatedByType: z.string().optional().describe('Actor type'),
      organization: z.string().optional().describe('Organization ID'),
      success: z.boolean().optional().describe('Whether the operation succeeded'),
      message: z.string().optional().describe('Human-readable event description')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        orgId: ctx.config.orgId
      });

      let lastTimestamp = ctx.state?.lastTimestamp as string | undefined;
      let startTime = lastTimestamp ?? new Date(Date.now() - 5 * 60 * 1000).toISOString();

      let result = await client.queryEvents({
        service: ['systems', 'mdm', 'software'],
        startTime,
        limit: 100,
        sort: 'ASC'
      });

      let newLastTimestamp = startTime;
      if (result.events.length > 0) {
        let lastEvent = result.events[result.events.length - 1]!;
        newLastTimestamp = lastEvent.timestamp ?? startTime;
      }

      return {
        inputs: result.events.map(e => ({
          eventId: e.id ?? `${e.timestamp}-${e.event_type}`,
          eventType: e.event_type ?? 'unknown',
          timestamp: e.timestamp ?? new Date().toISOString(),
          service: e.service ?? 'systems',
          initiatedById: e.initiated_by?.id,
          initiatedByType: e.initiated_by?.type,
          resourceId: e.resource?.id,
          resourceType: e.resource?.type,
          organization: e.organization,
          rawEvent: e
        })),
        updatedState: {
          lastTimestamp: newLastTimestamp
        }
      };
    },
    handleEvent: async ctx => {
      let raw = ctx.input.rawEvent ?? {};
      let success = raw.success !== undefined ? raw.success : undefined;

      let description = `${ctx.input.service} ${ctx.input.eventType}`;
      if (ctx.input.resourceId) {
        description += ` on system ${ctx.input.resourceId}`;
      }
      if (success !== undefined) {
        description += success ? ' (success)' : ' (failed)';
      }

      return {
        type: `system.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          service: ctx.input.service,
          systemId: ctx.input.resourceId,
          initiatedById: ctx.input.initiatedById,
          initiatedByType: ctx.input.initiatedByType,
          organization: ctx.input.organization,
          success,
          message: description
        }
      };
    }
  })
  .build();
