import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

export let getMachineMetrics = SlateTool.create(spec, {
  key: 'get_machine_metrics',
  name: 'Get Machine Metrics',
  description:
    'Retrieve previously submitted system, validator-client, and beacon-node monitoring metrics for the authenticated account within a Unix timestamp range.',
  instructions: [
    'Call list_machines to discover machine names. Omit machines to include all known machines.',
    'Keep the range and machine filters unchanged when continuing with paging.next_cursor.'
  ],
  constraints: ['The timestamp range may span at most 31 days, matching provider retention.'],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      startTimestamp: z
        .number()
        .int()
        .nonnegative()
        .describe('Inclusive range start in Unix seconds'),
      endTimestamp: z
        .number()
        .int()
        .nonnegative()
        .describe('Inclusive range end in Unix seconds'),
      machines: z
        .array(z.string())
        .max(20)
        .optional()
        .describe('Up to 20 names returned by list_machines'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe('Items per metric array; defaults to 10'),
      cursor: z.string().optional().describe('paging.next_cursor from the preceding response')
    })
  )
  .output(
    z.object({
      metrics: z.any().describe('Complete metrics response, including series-specific paging')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.endTimestamp < ctx.input.startTimestamp ||
      ctx.input.endTimestamp - ctx.input.startTimestamp > 31 * 86400
    ) {
      throw createApiServiceError(
        'The time range must be ordered from start to end and span at most 31 days.'
      );
    }
    let client = new BeaconchainClient({ token: ctx.auth.token, chain: ctx.config.chain });
    let metrics = await client.getMachineMetrics(
      ctx.input.startTimestamp,
      ctx.input.endTimestamp,
      ctx.input.machines,
      {
        pageSize: ctx.input.pageSize,
        cursor: ctx.input.cursor
      }
    );
    return { output: { metrics }, message: 'Retrieved monitoring machine metrics.' };
  })
  .build();
