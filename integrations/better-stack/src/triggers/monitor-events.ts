import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { UptimeClient } from '../lib/client';
import { spec } from '../spec';

export let monitorEvents = SlateTrigger.create(spec, {
  name: 'Monitor Status Changes',
  key: 'monitor_events',
  description:
    'Triggers when a monitor changes status (goes up, goes down, becomes paused/unpaused). Polls monitors periodically and detects status changes.'
})
  .input(
    z.object({
      eventType: z
        .enum(['up', 'down', 'paused', 'unpaused', 'validating', 'maintenance'])
        .describe('Type of monitor status change'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      monitorId: z.string().describe('Monitor ID'),
      name: z.string().nullable().describe('Monitor name'),
      url: z.string().nullable().describe('Monitored URL'),
      monitorType: z.string().nullable().describe('Type of monitor'),
      previousStatus: z.string().nullable().describe('Previous monitor status'),
      currentStatus: z.string().describe('Current monitor status'),
      lastCheckedAt: z.string().nullable().describe('Last check timestamp')
    })
  )
  .output(
    z.object({
      monitorId: z.string().describe('Monitor ID'),
      name: z.string().nullable().describe('Monitor name'),
      url: z.string().nullable().describe('Monitored URL'),
      monitorType: z.string().nullable().describe('Type of monitor'),
      previousStatus: z.string().nullable().describe('Previous monitor status'),
      currentStatus: z.string().describe('Current monitor status'),
      lastCheckedAt: z.string().nullable().describe('Last check timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new UptimeClient({
        token: ctx.auth.token,
        teamName: ctx.config.teamName
      });

      let state = ctx.state || {};
      let knownStatuses: Record<string, { status: string; paused: boolean }> =
        state.knownStatuses || {};
      let isFirstRun = !state.initialized;

      let allMonitors: any[] = [];
      let page = 1;
      let hasMore = true;

      // Fetch all monitors (up to 5 pages)
      while (hasMore && page <= 5) {
        let result = await client.listMonitors({ page, perPage: 50 });
        allMonitors = allMonitors.concat(result.data || []);
        hasMore = !!result.pagination?.next;
        page++;
      }

      let inputs: any[] = [];
      let newKnownStatuses: Record<string, { status: string; paused: boolean }> = {};

      for (let item of allMonitors) {
        let attrs = item.attributes || item;
        let monitorId = String(item.id);
        let currentStatus = attrs.status || 'unknown';
        let isPaused = attrs.paused === true;
        let known = knownStatuses[monitorId];

        newKnownStatuses[monitorId] = { status: currentStatus, paused: isPaused };

        // Skip events on first run (just record initial state)
        if (isFirstRun) continue;

        let baseEvent = {
          monitorId,
          name: attrs.pronounceable_name || null,
          url: attrs.url || null,
          monitorType: attrs.monitor_type || null,
          lastCheckedAt: attrs.last_checked_at || null
        };

        if (!known) {
          // New monitor detected
          inputs.push({
            eventType: (isPaused
              ? 'paused'
              : currentStatus === 'up'
                ? 'up'
                : currentStatus === 'down'
                  ? 'down'
                  : 'up') as any,
            eventId: `${monitorId}_new_${Date.now()}`,
            previousStatus: null,
            currentStatus,
            ...baseEvent
          });
          continue;
        }

        // Detect pause/unpause changes
        if (isPaused && !known.paused) {
          inputs.push({
            eventType: 'paused' as const,
            eventId: `${monitorId}_paused_${Date.now()}`,
            previousStatus: known.status,
            currentStatus,
            ...baseEvent
          });
          continue;
        }

        if (!isPaused && known.paused) {
          inputs.push({
            eventType: 'unpaused' as const,
            eventId: `${monitorId}_unpaused_${Date.now()}`,
            previousStatus: known.status,
            currentStatus,
            ...baseEvent
          });
          continue;
        }

        // Detect status changes (up/down/maintenance/validating)
        if (currentStatus !== known.status) {
          let eventType: 'up' | 'down' | 'maintenance' | 'validating' = 'up';
          if (currentStatus === 'down') eventType = 'down';
          else if (currentStatus === 'maintenance') eventType = 'maintenance';
          else if (currentStatus === 'validating') eventType = 'validating';

          inputs.push({
            eventType,
            eventId: `${monitorId}_${eventType}_${Date.now()}`,
            previousStatus: known.status,
            currentStatus,
            ...baseEvent
          });
        }
      }

      return {
        inputs,
        updatedState: {
          initialized: true,
          knownStatuses: newKnownStatuses
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `monitor.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          monitorId: ctx.input.monitorId,
          name: ctx.input.name,
          url: ctx.input.url,
          monitorType: ctx.input.monitorType,
          previousStatus: ctx.input.previousStatus,
          currentStatus: ctx.input.currentStatus,
          lastCheckedAt: ctx.input.lastCheckedAt
        }
      };
    }
  })
  .build();
