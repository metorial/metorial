import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MonitoringClient } from '../lib/client';
import { spec } from '../spec';

export let workerStatusChangeTrigger = SlateTrigger.create(spec, {
  name: 'Worker Status Change',
  key: 'worker_status_change',
  description:
    'Fires when a worker changes status (e.g. online to offline, offline to online, or becomes idle). Polls all workers and detects status transitions.'
})
  .input(
    z.object({
      eventType: z
        .enum(['worker.online', 'worker.offline', 'worker.idle', 'worker.status_changed'])
        .describe('Type of status change event'),
      eventId: z.string().describe('Unique event identifier'),
      workerName: z.string().describe('Name of the worker'),
      previousStatus: z.string().describe('Previous worker status'),
      currentStatus: z.string().describe('Current worker status'),
      workerData: z.record(z.string(), z.any()).describe('Full worker data at time of event')
    })
  )
  .output(
    z.object({
      workerName: z.string().describe('Name of the affected worker'),
      previousStatus: z.string().describe('Previous worker status'),
      currentStatus: z.string().describe('Current worker status'),
      workerType: z.string().describe('Worker type (nvidia, amd, asic)'),
      system: z.string().describe('Worker operating system'),
      groups: z.string().describe('Assigned groups'),
      mainCoin: z.string().describe('Main coin being mined'),
      mainHashrate: z.number().describe('Current main coin hashrate'),
      mainHashrateUnit: z.string().describe('Hashrate unit'),
      totalConsumption: z.number().describe('Total power consumption in watts'),
      deviceCount: z.number().describe('Number of devices in the rig')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MonitoringClient({ accessKey: ctx.auth.accessKey });
      let workers = await client.listWorkers();

      let previousStatuses: Record<string, string> = ctx.state?.workerStatuses ?? {};
      let inputs: Array<{
        eventType:
          | 'worker.online'
          | 'worker.offline'
          | 'worker.idle'
          | 'worker.status_changed';
        eventId: string;
        workerName: string;
        previousStatus: string;
        currentStatus: string;
        workerData: Record<string, any>;
      }> = [];

      let currentStatuses: Record<string, string> = {};

      for (let [name, data] of Object.entries(workers)) {
        let currentStatus = (data as any)?.info?.status ?? 'unknown';
        currentStatuses[name] = currentStatus;

        let previousStatus = previousStatuses[name];

        if (previousStatus !== undefined && previousStatus !== currentStatus) {
          let eventType:
            | 'worker.online'
            | 'worker.offline'
            | 'worker.idle'
            | 'worker.status_changed';
          if (currentStatus === 'online') {
            eventType = 'worker.online';
          } else if (currentStatus === 'offline') {
            eventType = 'worker.offline';
          } else if (currentStatus === 'idle') {
            eventType = 'worker.idle';
          } else {
            eventType = 'worker.status_changed';
          }

          inputs.push({
            eventType,
            eventId: `${name}-${previousStatus}-${currentStatus}-${Date.now()}`,
            workerName: name,
            previousStatus,
            currentStatus,
            workerData: data as Record<string, any>
          });
        }
      }

      return {
        inputs,
        updatedState: {
          workerStatuses: currentStatuses
        }
      };
    },

    handleEvent: async ctx => {
      let w = ctx.input.workerData;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          workerName: ctx.input.workerName,
          previousStatus: ctx.input.previousStatus,
          currentStatus: ctx.input.currentStatus,
          workerType: w?.info?.type ?? '',
          system: w?.info?.system ?? '',
          groups: w?.info?.groups ?? '',
          mainCoin: w?.info?.mining?.coin ?? '',
          mainHashrate: w?.info?.hashrate?.main?.hashrate ?? 0,
          mainHashrateUnit: w?.info?.hashrate?.main?.unit ?? '',
          totalConsumption: w?.info?.consumption ?? 0,
          deviceCount: w?.info?.devices ?? 0
        }
      };
    }
  })
  .build();
