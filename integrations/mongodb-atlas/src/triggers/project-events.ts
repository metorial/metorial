import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let projectEventsTrigger = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description:
    '[Polling fallback] Polls for new events in a MongoDB Atlas project. Detects cluster changes, user modifications, backup events, network changes, and other administrative operations.'
})
  .input(
    z.object({
      eventId: z.string().describe('Event ID'),
      eventTypeName: z.string().describe('Event type name'),
      created: z.string().describe('Event creation timestamp'),
      groupId: z.string().optional().describe('Project (group) ID'),
      orgId: z.string().optional().describe('Organization ID'),
      clusterName: z.string().optional().describe('Cluster name'),
      targetUsername: z.string().optional().describe('Target username'),
      hostname: z.string().optional().describe('Hostname'),
      raw: z.any().describe('Full event data')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Event ID'),
      eventTypeName: z.string().describe('Event type'),
      created: z.string().describe('When the event occurred'),
      projectId: z.string().optional().describe('Project ID'),
      organizationId: z.string().optional().describe('Organization ID'),
      clusterName: z.string().optional(),
      targetUsername: z.string().optional(),
      hostname: z.string().optional(),
      isAlert: z.boolean().describe('Whether this event is alert-related')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.auth);
      let projectId = ctx.config.projectId;
      if (!projectId)
        throw new Error('projectId is required in config for project event polling.');

      let state = ctx.state || {};
      let lastPolledAt = state.lastPolledAt as string | undefined;

      let params: any = {
        itemsPerPage: 100
      };
      if (lastPolledAt) {
        params.minDate = lastPolledAt;
      }

      let result = await client.listProjectEvents(projectId, params);
      let events = result.results || [];

      // Filter out events we've already seen (based on lastPolledAt)
      let lastEventIds = (state.lastEventIds as string[]) || [];
      let newEvents = events.filter((e: any) => !lastEventIds.includes(e.id));

      let newLastPolledAt =
        newEvents.length > 0 ? newEvents[0].created : lastPolledAt || new Date().toISOString();

      let newLastEventIds = newEvents.slice(0, 50).map((e: any) => e.id);

      return {
        inputs: newEvents.map((e: any) => ({
          eventId: e.id,
          eventTypeName: e.eventTypeName,
          created: e.created,
          groupId: e.groupId,
          orgId: e.orgId,
          clusterName: e.clusterName,
          targetUsername: e.targetUsername,
          hostname: e.hostname,
          raw: e
        })),
        updatedState: {
          lastPolledAt: newLastPolledAt,
          lastEventIds: newLastEventIds
        }
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      let typeParts = (input.eventTypeName || 'UNKNOWN').toLowerCase().split('_');
      let resource = typeParts[0] || 'event';
      let action = typeParts.slice(1).join('_') || 'occurred';
      let eventType = `${resource}.${action}`;

      let isAlert =
        (input.eventTypeName || '').includes('ALERT') ||
        (input.eventTypeName || '').includes('OUTSIDE_METRIC_THRESHOLD');

      return {
        type: eventType,
        id: input.eventId,
        output: {
          eventId: input.eventId,
          eventTypeName: input.eventTypeName,
          created: input.created,
          projectId: input.groupId,
          organizationId: input.orgId,
          clusterName: input.clusterName,
          targetUsername: input.targetUsername,
          hostname: input.hostname,
          isAlert
        }
      };
    }
  })
  .build();
