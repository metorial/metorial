import { SlateTool } from 'slates';
import { z } from 'zod';
import { MonitoringClient } from '../lib/client';
import { parseMinerstatResponse } from '../lib/response';
import { spec } from '../spec';

let workerOutputSchema = z.object({
  workerName: z.string().describe('Worker name'),
  status: z.string().describe('Worker status (online, offline, idle)'),
  workerType: z.string().describe('Worker type (nvidia, amd, asic)'),
  system: z.string().describe('Operating system'),
  syncSeconds: z.number().describe('Seconds since last sync'),
  groups: z.string().describe('Comma-separated list of assigned groups'),
  deviceCount: z.number().describe('Number of devices in the rig'),
  totalConsumption: z.number().describe('Total power consumption in watts'),
  mainCoin: z.string().describe('Main coin being mined'),
  mainHashrate: z.number().describe('Main coin hashrate'),
  mainHashrateUnit: z.string().describe('Main coin hashrate unit'),
  dualCoin: z.string().describe('Dual coin being mined'),
  dualHashrate: z.number().describe('Dual coin hashrate'),
  dualHashrateUnit: z.string().describe('Dual coin hashrate unit'),
  miningClient: z.string().describe('Mining client software in use'),
  revenueMainUsd: z.number().describe('Estimated USD/day for main coin'),
  revenueDualUsd: z.number().describe('Estimated USD/day for dual coin'),
  acceptedSharesMain: z.number().describe('Accepted shares for main coin'),
  rejectedSharesMain: z.number().describe('Rejected shares for main coin'),
  hardware: z
    .array(
      z.object({
        name: z.string().describe('Hardware device name'),
        temperature: z.number().describe('Temperature in Celsius'),
        fan: z.number().describe('Fan speed in % or RPM'),
        power: z.number().describe('Power consumption in watts')
      })
    )
    .describe('List of hardware devices')
});

let outputSchema = z.object({
  workers: z.array(workerOutputSchema),
  response: z.any().optional().describe('Original API response'),
  totalCount: z.number().describe('Number of workers returned')
});

export let listWorkersTool = SlateTool.create(spec, {
  name: 'List Workers',
  key: 'list_workers',
  description: `Retrieve real-time status for all mining workers or a specific worker. Returns hashrate, hardware temperatures, fan speeds, power consumption, mining coin, estimated earnings, shares, and system information. Use this for monitoring your mining fleet.`,
  instructions: [
    'To get all workers, leave workerName empty. To get a specific worker, provide its name.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workerName: z
        .string()
        .optional()
        .describe('Specific worker name to retrieve. Leave empty to list all workers.')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new MonitoringClient({ accessKey: ctx.auth.accessKey });

    ctx.progress('Fetching worker data...');
    let data: Record<string, any>;
    if (ctx.input.workerName) {
      data = await client.getWorker(ctx.input.workerName);
    } else {
      data = await client.listWorkers();
    }

    data = parseMinerstatResponse(z.record(z.string(), z.record(z.string(), z.any())), data);

    let workers = Object.entries(data).map(([name, w]: [string, any]) => ({
      workerName: name,
      status: w?.info?.status,
      workerType: w?.info?.type,
      system: w?.info?.system,
      syncSeconds: w?.info?.sync,
      groups: w?.info?.groups,
      deviceCount: w?.info?.devices,
      totalConsumption: w?.info?.consumption,
      mainCoin: w?.info?.mining?.coin,
      mainHashrate: w?.info?.hashrate?.main?.hashrate,
      mainHashrateUnit: w?.info?.hashrate?.main?.unit,
      dualCoin: w?.info?.mining?.dualCoin,
      dualHashrate: w?.info?.hashrate?.dual?.hashrate,
      dualHashrateUnit: w?.info?.hashrate?.dual?.unit,
      miningClient: w?.info?.mining?.client,
      revenueMainUsd: w?.info?.revenue?.main,
      revenueDualUsd: w?.info?.revenue?.dual,
      acceptedSharesMain: w?.info?.shares?.main?.accepted,
      rejectedSharesMain: w?.info?.shares?.main?.rejected,
      hardware: parseMinerstatResponse(
        z.array(z.record(z.string(), z.any())),
        w?.hardware
      ).map((h: any) => ({
        name: h?.name,
        temperature: h?.temperature,
        fan: h?.fan,
        power: h?.power
      }))
    }));

    let onlineCount = workers.filter(w => w.status === 'online').length;
    let offlineCount = workers.filter(w => w.status === 'offline').length;

    return {
      output: parseMinerstatResponse(outputSchema, {
        workers,
        totalCount: workers.length,
        response: data
      }),
      message: `Retrieved **${workers.length}** worker(s): **${onlineCount}** online, **${offlineCount}** offline.`
    };
  })
  .build();
