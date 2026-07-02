import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let directoryEvents = SlateTrigger.create(spec, {
  name: 'Directory Events',
  key: 'directory_events',
  description:
    'Polls JumpCloud Directory Insights for directory-level events including user creation, updates, deletions, admin changes, association changes, and privilege escalation events.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      eventType: z.string().describe('Event type'),
      timestamp: z.string().describe('Event timestamp'),
      service: z.string().describe('Service category'),
      initiatedById: z.string().optional().describe('ID of the actor who initiated the event'),
      initiatedByType: z.string().optional().describe('Type of the initiating actor'),
      initiatedByEmail: z.string().optional().describe('Email of the initiating actor'),
      resourceId: z.string().optional().describe('Affected resource ID'),
      resourceType: z.string().optional().describe('Affected resource type'),
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
      initiatedById: z.string().optional().describe('Actor ID'),
      initiatedByType: z.string().optional().describe('Actor type'),
      initiatedByEmail: z.string().optional().describe('Actor email'),
      resourceId: z.string().optional().describe('Affected resource ID'),
      resourceType: z.string().optional().describe('Affected resource type'),
      organization: z.string().optional().describe('Organization ID'),
      changes: z.any().optional().describe('Changes made in the event'),
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
        service: ['directory'],
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
          service: e.service ?? 'directory',
          initiatedById: e.initiated_by?.id,
          initiatedByType: e.initiated_by?.type,
          initiatedByEmail: e.initiated_by?.email,
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
      let description = `${ctx.input.eventType} event`;
      if (ctx.input.initiatedByEmail) {
        description += ` by ${ctx.input.initiatedByEmail}`;
      }
      if (ctx.input.resourceType) {
        description += ` on ${ctx.input.resourceType}`;
      }
      if (ctx.input.resourceId) {
        description += ` (${ctx.input.resourceId})`;
      }

      return {
        type: `directory.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          service: ctx.input.service,
          initiatedById: ctx.input.initiatedById,
          initiatedByType: ctx.input.initiatedByType,
          initiatedByEmail: ctx.input.initiatedByEmail,
          resourceId: ctx.input.resourceId,
          resourceType: ctx.input.resourceType,
          organization: ctx.input.organization,
          changes: raw.changes,
          message: description
        }
      };
    }
  })
  .build();
