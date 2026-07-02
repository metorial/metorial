import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MonitoringClient } from '../lib/client';
import { spec } from '../spec';

export let workerHashrateDropTrigger = SlateTrigger.create(spec, {
  name: 'Worker Hashrate Drop',
  key: 'worker_hashrate_drop',
  description:
    "Fires when a worker's hashrate drops significantly compared to the previously recorded hashrate. Detects mining performance degradation. The drop threshold is based on the percentage change between polling intervals."
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      workerName: z.string().describe('Name of the worker with hashrate drop'),
      previousHashrate: z.number().describe('Previous hashrate value'),
      currentHashrate: z.number().describe('Current hashrate value'),
      hashrateUnit: z.string().describe('Hashrate unit'),
      dropPercentage: z.number().describe('Percentage drop in hashrate'),
      mainCoin: z.string().describe('Main coin being mined')
    })
  )
  .output(
    z.object({
      workerName: z.string().describe('Name of the affected worker'),
      previousHashrate: z.number().describe('Previous hashrate value'),
      currentHashrate: z.number().describe('Current hashrate value'),
      hashrateUnit: z.string().describe('Hashrate unit'),
      dropPercentage: z.number().describe('Percentage drop'),
      mainCoin: z.string().describe('Coin being mined'),
      status: z.string().describe('Current worker status'),
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

      let previousHashrates: Record<string, number> = ctx.state?.workerHashrates ?? {};
      let dropThreshold = ctx.state?.dropThresholdPercent ?? 20;
      let inputs: Array<{
        eventId: string;
        workerName: string;
        previousHashrate: number;
        currentHashrate: number;
        hashrateUnit: string;
        dropPercentage: number;
        mainCoin: string;
      }> = [];

      let currentHashrates: Record<string, number> = {};

      for (let [name, data] of Object.entries(workers)) {
        let info = (data as any)?.info;
        let currentHashrate = info?.hashrate?.main?.hashrate ?? 0;
        let hashrateUnit = info?.hashrate?.main?.unit ?? '';
        let mainCoin = info?.mining?.coin ?? '';
        currentHashrates[name] = currentHashrate;

        let previousHashrate = previousHashrates[name];
        if (
          previousHashrate !== undefined &&
          previousHashrate > 0 &&
          currentHashrate < previousHashrate
        ) {
          let dropPercentage = ((previousHashrate - currentHashrate) / previousHashrate) * 100;

          if (dropPercentage >= dropThreshold) {
            inputs.push({
              eventId: `${name}-hashrate-drop-${Date.now()}`,
              workerName: name,
              previousHashrate,
              currentHashrate,
              hashrateUnit,
              dropPercentage: Math.round(dropPercentage * 100) / 100,
              mainCoin
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          workerHashrates: currentHashrates,
          dropThresholdPercent: dropThreshold
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'worker.hashrate_drop',
        id: ctx.input.eventId,
        output: {
          workerName: ctx.input.workerName,
          previousHashrate: ctx.input.previousHashrate,
          currentHashrate: ctx.input.currentHashrate,
          hashrateUnit: ctx.input.hashrateUnit,
          dropPercentage: ctx.input.dropPercentage,
          mainCoin: ctx.input.mainCoin,
          status: 'online',
          deviceCount: 0
        }
      };
    }
  })
  .build();
