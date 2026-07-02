import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

let billingRecordSchema = z.object({
  amount: z.number().nullable().describe('Cost in USD'),
  time: z.string().nullable().describe('Time bucket (ISO 8601)'),
  timeBilledMs: z.number().nullable().describe('Time billed in milliseconds'),
  diskSpaceBilledGb: z.number().nullable().describe('Disk space billed in GB'),
  podId: z.string().nullable().optional().describe('Pod ID (if grouped by Pod)'),
  gpuTypeId: z.string().nullable().optional().describe('GPU type (if grouped by GPU)'),
  endpointId: z.string().nullable().optional().describe('Endpoint ID (if applicable)')
});

export let getBilling = SlateTool.create(spec, {
  name: 'Get Billing',
  key: 'get_billing',
  description: `Retrieve billing history for Pods, Serverless endpoints, or Network Volumes. Filter by date range, resource ID, and grouping to analyze costs. Amounts are in USD.`,
  instructions: [
    'Use ISO 8601 timestamps for startTime and endTime, e.g. "2024-01-01T00:00:00Z".',
    'Bucket sizes: hour, day, week, month, year.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['pods', 'endpoints', 'network_volumes'])
        .describe('Type of resource to get billing for'),
      bucketSize: z
        .enum(['hour', 'day', 'week', 'month', 'year'])
        .optional()
        .describe('Aggregation interval (default: day)'),
      startTime: z.string().optional().describe('Start time (ISO 8601)'),
      endTime: z.string().optional().describe('End time (ISO 8601)'),
      podId: z.string().optional().describe('Filter by Pod ID (for pods billing)'),
      endpointId: z
        .string()
        .optional()
        .describe('Filter by endpoint ID (for endpoints billing)'),
      gpuTypeId: z.string().optional().describe('Filter by GPU type'),
      grouping: z.string().optional().describe('Group by: podId, gpuTypeId, or endpointId')
    })
  )
  .output(
    z.object({
      records: z.array(billingRecordSchema).describe('Billing records'),
      totalAmount: z.number().describe('Sum of all billing amounts in USD')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });
    let {
      resourceType,
      bucketSize,
      startTime,
      endTime,
      podId,
      endpointId,
      gpuTypeId,
      grouping
    } = ctx.input;

    let result: any[];

    switch (resourceType) {
      case 'pods':
        result = await client.getPodBilling({
          bucketSize,
          startTime,
          endTime,
          podId,
          gpuTypeId,
          grouping
        });
        break;
      case 'endpoints':
        result = await client.getEndpointBilling({
          bucketSize,
          startTime,
          endTime,
          endpointId,
          gpuTypeId: gpuTypeId ? [gpuTypeId] : undefined,
          grouping
        });
        break;
      case 'network_volumes':
        result = await client.getNetworkVolumeBilling({ bucketSize, startTime, endTime });
        break;
    }

    let records = Array.isArray(result!) ? result! : [];

    let mapped = records.map((r: any) => ({
      amount: r.amount ?? null,
      time: r.time ?? null,
      timeBilledMs: r.timeBilledMs ?? null,
      diskSpaceBilledGb: r.diskSpaceBilledGb ?? null,
      podId: r.podId ?? null,
      gpuTypeId: r.gpuTypeId ?? null,
      endpointId: r.endpointId ?? null
    }));

    let totalAmount = mapped.reduce((sum, r) => sum + (r.amount ?? 0), 0);

    return {
      output: { records: mapped, totalAmount },
      message: `${resourceType} billing: **$${totalAmount.toFixed(2)}** total across **${mapped.length}** record(s).`
    };
  })
  .build();
