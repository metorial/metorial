import { createApiServiceError, SlateTool } from 'slates';
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
  endpointId: z.string().nullable().optional().describe('Endpoint ID (if applicable)'),
  networkVolumeId: z.string().nullable().describe('Network volume ID (if applicable)'),
  endTime: z.string().nullable().describe('End of the time bucket, exclusive.'),
  gpuAmount: z.number().nullable().describe('GPU compute cost in USD.'),
  cpuAmount: z.number().nullable().describe('CPU compute cost in USD.'),
  diskAmount: z.number().nullable().describe('Container disk cost in USD.'),
  feeAmount: z.number().nullable().describe('Platform fee in USD.'),
  standardAmount: z.number().nullable().describe('Standard network storage cost in USD.'),
  highPerformanceAmount: z
    .number()
    .nullable()
    .describe('High-performance network storage cost in USD.')
});

export let getBilling = SlateTool.create(spec, {
  name: 'Get Billing',
  key: 'get_billing',
  description: `Retrieve billing history for Pods, Serverless endpoints, or Network Volumes. Filter by date range and resource ID to analyze costs. Amounts are in USD.`,
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
      startTime: z.iso.datetime({ offset: true }).optional().describe('Start time (ISO 8601)'),
      endTime: z.iso.datetime({ offset: true }).optional().describe('End time (ISO 8601)'),
      podId: z.string().optional().describe('Filter by Pod ID (for pods billing)'),
      endpointId: z
        .string()
        .optional()
        .describe('Filter by endpoint ID (for endpoints billing)'),
      networkVolumeId: z
        .string()
        .min(1)
        .optional()
        .describe('Filter by network volume ID (for network_volumes billing).'),
      gpuTypeId: z
        .string()
        .optional()
        .describe(
          'Retained for compatibility. The current API does not support GPU filtering; omit this field.'
        ),
      grouping: z
        .string()
        .optional()
        .describe(
          'Retained for compatibility. The current API groups by resource ID automatically; omit this field.'
        )
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
      networkVolumeId,
      gpuTypeId,
      grouping
    } = ctx.input;

    if (gpuTypeId !== undefined || grouping !== undefined)
      throw createApiServiceError(
        'GPU filtering and custom grouping are not supported by the current Runpod billing API. Omit gpuTypeId and grouping.'
      );
    if (resourceType !== 'pods' && podId !== undefined)
      throw createApiServiceError('podId is only supported for pods billing.');
    if (resourceType !== 'endpoints' && endpointId !== undefined)
      throw createApiServiceError('endpointId is only supported for endpoints billing.');
    if (resourceType !== 'network_volumes' && networkVolumeId !== undefined)
      throw createApiServiceError(
        'networkVolumeId is only supported for network_volumes billing.'
      );
    if (startTime && endTime && Date.parse(startTime) >= Date.parse(endTime))
      throw createApiServiceError('startTime must be before endTime.');
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
        result = await client.getNetworkVolumeBilling({
          bucketSize,
          startTime,
          endTime,
          networkVolumeId
        });
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
      endpointId: r.endpointId ?? null,
      networkVolumeId: r.networkVolumeId ?? null,
      endTime: r.endTime ?? null,
      gpuAmount: r.gpuAmount ?? null,
      cpuAmount: r.cpuAmount ?? null,
      diskAmount: r.diskAmount ?? null,
      feeAmount: r.feeAmount ?? null,
      standardAmount: r.standardAmount ?? null,
      highPerformanceAmount: r.highPerformanceAmount ?? null
    }));

    let totalAmount = mapped.reduce((sum, r) => sum + (r.amount ?? 0), 0);

    return {
      output: { records: mapped, totalAmount },
      message: `${resourceType} billing: **$${totalAmount.toFixed(2)}** total across **${mapped.length}** record(s).`
    };
  })
  .build();
