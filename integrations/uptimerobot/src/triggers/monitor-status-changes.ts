import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let monitorStatusChanges = SlateTrigger.create(spec, {
  name: 'Monitor Status Changes',
  key: 'monitor_status_changes',
  description:
    'Triggers when a monitor changes status (e.g. goes down, comes back up, gets paused). Polls UptimeRobot for current monitor statuses and emits events when changes are detected.'
})
  .input(
    z.object({
      monitorId: z.number().describe('ID of the monitor that changed status'),
      friendlyName: z.string().describe('Display name of the monitor'),
      url: z.string().describe('URL or IP being monitored'),
      type: z
        .number()
        .describe('Monitor type: 1=HTTP(s), 2=Keyword, 3=Ping, 4=Port, 5=Heartbeat'),
      previousStatus: z.number().describe('Previous status before the change'),
      currentStatus: z.number().describe('Current status after the change')
    })
  )
  .output(
    z.object({
      monitorId: z.number().describe('ID of the affected monitor'),
      friendlyName: z.string().describe('Display name of the monitor'),
      url: z.string().describe('URL or IP being monitored'),
      monitorType: z
        .number()
        .describe('Monitor type: 1=HTTP(s), 2=Keyword, 3=Ping, 4=Port, 5=Heartbeat'),
      previousStatus: z.string().describe('Previous status label'),
      currentStatus: z.string().describe('Current status label'),
      previousStatusCode: z.number().describe('Previous status code'),
      currentStatusCode: z.number().describe('Current status code')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let previousStatuses: Record<string, number> =
        (ctx.state?.monitorStatuses as Record<string, number>) || {};

      let allMonitors: any[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        let result = await client.getMonitors({ offset, limit: 50 });
        allMonitors.push(...result.monitors);
        if (result.pagination && allMonitors.length < result.pagination.total) {
          offset += 50;
        } else {
          hasMore = false;
        }
      }

      let inputs: any[] = [];
      let newStatuses: Record<string, number> = {};

      for (let monitor of allMonitors) {
        let monitorIdStr = String(monitor.id);
        newStatuses[monitorIdStr] = monitor.status;

        let prevStatus = previousStatuses[monitorIdStr];
        if (prevStatus !== undefined && prevStatus !== monitor.status) {
          inputs.push({
            monitorId: monitor.id,
            friendlyName: monitor.friendly_name,
            url: monitor.url,
            type: monitor.type,
            previousStatus: prevStatus,
            currentStatus: monitor.status
          });
        }
      }

      return {
        inputs,
        updatedState: {
          monitorStatuses: newStatuses
        }
      };
    },

    handleEvent: async ctx => {
      let statusLabels: Record<number, string> = {
        0: 'Paused',
        1: 'Not checked yet',
        2: 'Up',
        8: 'Seems down',
        9: 'Down'
      };

      let previousLabel =
        statusLabels[ctx.input.previousStatus] || `Unknown (${ctx.input.previousStatus})`;
      let currentLabel =
        statusLabels[ctx.input.currentStatus] || `Unknown (${ctx.input.currentStatus})`;

      let eventType = 'monitor.status_changed';
      if (ctx.input.currentStatus === 9 || ctx.input.currentStatus === 8) {
        eventType = 'monitor.down';
      } else if (
        ctx.input.currentStatus === 2 &&
        (ctx.input.previousStatus === 9 || ctx.input.previousStatus === 8)
      ) {
        eventType = 'monitor.up';
      } else if (ctx.input.currentStatus === 0) {
        eventType = 'monitor.paused';
      } else if (ctx.input.previousStatus === 0 && ctx.input.currentStatus !== 0) {
        eventType = 'monitor.resumed';
      }

      return {
        type: eventType,
        id: `${ctx.input.monitorId}-${ctx.input.previousStatus}-${ctx.input.currentStatus}-${Date.now()}`,
        output: {
          monitorId: ctx.input.monitorId,
          friendlyName: ctx.input.friendlyName,
          url: ctx.input.url,
          monitorType: ctx.input.type,
          previousStatus: previousLabel,
          currentStatus: currentLabel,
          previousStatusCode: ctx.input.previousStatus,
          currentStatusCode: ctx.input.currentStatus
        }
      };
    }
  })
  .build();
