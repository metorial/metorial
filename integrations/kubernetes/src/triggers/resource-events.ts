import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createKubeClient } from '../lib/client';
import { spec } from '../spec';

export let resourceEvents = SlateTrigger.create(spec, {
  name: 'Resource Events',
  key: 'resource_events',
  description:
    'Polls for new Kubernetes events across the cluster or within a specific namespace. Events include pod scheduling, container starts/stops, scaling, errors, warnings, and more.'
})
  .input(
    z.object({
      eventUid: z.string().describe('UID of the Kubernetes event'),
      eventType: z.string().describe('Event type (Normal, Warning)'),
      reason: z.string().describe('Short reason for the event'),
      message: z.string().describe('Descriptive message'),
      involvedObjectKind: z.string().optional().describe('Kind of the involved resource'),
      involvedObjectName: z.string().optional().describe('Name of the involved resource'),
      involvedObjectNamespace: z
        .string()
        .optional()
        .describe('Namespace of the involved resource'),
      resourceVersion: z.string().optional().describe('Resource version of the event'),
      firstTimestamp: z.string().optional().describe('First time the event occurred'),
      lastTimestamp: z.string().optional().describe('Last time the event occurred'),
      count: z.number().optional().describe('Number of times the event occurred'),
      sourceComponent: z.string().optional().describe('Component that reported the event')
    })
  )
  .output(
    z.object({
      eventUid: z.string().describe('UID of the Kubernetes event'),
      eventType: z.string().describe('Normal or Warning'),
      reason: z.string().describe('Short machine-readable reason'),
      message: z.string().describe('Human-readable event message'),
      involvedObjectKind: z
        .string()
        .optional()
        .describe('Kind of the involved resource (Pod, Deployment, etc.)'),
      involvedObjectName: z.string().optional().describe('Name of the involved resource'),
      involvedObjectNamespace: z
        .string()
        .optional()
        .describe('Namespace of the involved resource'),
      firstOccurrence: z.string().optional().describe('First time this event occurred'),
      lastOccurrence: z.string().optional().describe('Most recent occurrence'),
      occurrenceCount: z.number().optional().describe('Number of times this event occurred'),
      sourceComponent: z.string().optional().describe('Component that generated the event')
    })
  )
  .polling({
    options: {
      intervalInSeconds: 60
    },

    pollEvents: async ctx => {
      let client = createKubeClient(ctx.config, ctx.auth);

      let lastResourceVersion: string | undefined = ctx.state?.lastResourceVersion;
      let seenUids: string[] = ctx.state?.seenUids || [];

      let events = await client.listClusterEvents({
        limit: 100
      });

      let newEvents = events.items.filter(event => {
        let uid = event.metadata?.uid;
        if (!uid) return false;
        if (seenUids.includes(uid)) return false;
        return true;
      });

      // On first poll, only track but don't emit (avoid flooding with historical events)
      if (!lastResourceVersion) {
        let allUids = events.items
          .map(e => e.metadata?.uid)
          .filter((uid): uid is string => !!uid);

        return {
          inputs: [],
          updatedState: {
            lastResourceVersion: events.metadata?.resourceVersion,
            seenUids: allUids.slice(-500)
          }
        };
      }

      let inputs = newEvents.map(event => {
        let involvedObject = event.regarding || event.involvedObject;
        let series = event.series as
          | {
              count?: number;
              lastObservedTime?: string;
            }
          | undefined;

        return {
          eventUid: event.metadata?.uid || '',
          eventType: event.type || 'Normal',
          reason: event.reason || '',
          message: event.note || event.message || '',
          involvedObjectKind: involvedObject?.kind,
          involvedObjectName: involvedObject?.name,
          involvedObjectNamespace: involvedObject?.namespace,
          resourceVersion: event.metadata?.resourceVersion,
          firstTimestamp:
            event.deprecatedFirstTimestamp || event.firstTimestamp || event.eventTime,
          lastTimestamp:
            event.deprecatedLastTimestamp ||
            event.lastTimestamp ||
            series?.lastObservedTime ||
            event.eventTime,
          count: event.deprecatedCount ?? event.count ?? series?.count,
          sourceComponent:
            event.reportingController ||
            event.deprecatedSource?.component ||
            event.source?.component
        };
      });

      let updatedUids = [
        ...seenUids,
        ...newEvents.map(e => e.metadata?.uid).filter((uid): uid is string => !!uid)
      ].slice(-500);

      return {
        inputs,
        updatedState: {
          lastResourceVersion: events.metadata?.resourceVersion,
          seenUids: updatedUids
        }
      };
    },

    handleEvent: async ctx => {
      let kind = ctx.input.involvedObjectKind?.toLowerCase() || 'unknown';
      let eventType = ctx.input.eventType?.toLowerCase() === 'warning' ? 'warning' : 'normal';

      return {
        type: `${kind}.${eventType}`,
        id: ctx.input.eventUid,
        output: {
          eventUid: ctx.input.eventUid,
          eventType: ctx.input.eventType,
          reason: ctx.input.reason,
          message: ctx.input.message,
          involvedObjectKind: ctx.input.involvedObjectKind,
          involvedObjectName: ctx.input.involvedObjectName,
          involvedObjectNamespace: ctx.input.involvedObjectNamespace,
          firstOccurrence: ctx.input.firstTimestamp,
          lastOccurrence: ctx.input.lastTimestamp,
          occurrenceCount: ctx.input.count,
          sourceComponent: ctx.input.sourceComponent
        }
      };
    }
  })
  .build();
