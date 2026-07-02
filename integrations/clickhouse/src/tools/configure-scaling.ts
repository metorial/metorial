import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { clickhouseServiceError } from '../lib/errors';
import { spec } from '../spec';

export let configureScaling = SlateTool.create(spec, {
  name: 'Configure Scaling',
  key: 'configure_scaling',
  description: `Update the scaling configuration for a ClickHouse service. Adjust replica memory ranges, number of replicas, idle scaling behavior, and idle timeout.`,
  instructions: [
    'Per-replica memory must be a multiple of 4 GB, range 8-356 GB.',
    'numReplicas is usually 2-20 for the first service in a warehouse and can be as low as 1 for services in an existing warehouse.'
  ]
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service to configure'),
      minReplicaMemoryGb: z
        .number()
        .optional()
        .describe('Minimum memory per replica in GB (multiple of 4, range 8-356)'),
      maxReplicaMemoryGb: z
        .number()
        .optional()
        .describe('Maximum memory per replica in GB (multiple of 4, range 8-356)'),
      numReplicas: z.number().optional().describe('Number of replicas (1-20)'),
      idleScaling: z.boolean().optional().describe('Enable or disable idle scaling'),
      idleTimeoutMinutes: z
        .number()
        .optional()
        .describe('Minutes of inactivity before idling (minimum 5)')
    })
  )
  .output(
    z.object({
      serviceId: z.string(),
      name: z.string().optional(),
      state: z.string().optional(),
      minReplicaMemoryGb: z.number().optional(),
      maxReplicaMemoryGb: z.number().optional(),
      numReplicas: z.number().optional(),
      idleScaling: z.boolean().optional(),
      idleTimeoutMinutes: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {};
    if (ctx.input.minReplicaMemoryGb !== undefined)
      body.minReplicaMemoryGb = ctx.input.minReplicaMemoryGb;
    if (ctx.input.maxReplicaMemoryGb !== undefined)
      body.maxReplicaMemoryGb = ctx.input.maxReplicaMemoryGb;
    if (ctx.input.numReplicas !== undefined) body.numReplicas = ctx.input.numReplicas;
    if (ctx.input.idleScaling !== undefined) body.idleScaling = ctx.input.idleScaling;
    if (ctx.input.idleTimeoutMinutes !== undefined)
      body.idleTimeoutMinutes = ctx.input.idleTimeoutMinutes;

    if (Object.keys(body).length === 0) {
      throw clickhouseServiceError('Provide at least one scaling field to update.');
    }

    let result = await client.updateServiceScaling(ctx.input.serviceId, body);

    return {
      output: {
        serviceId: result.id || ctx.input.serviceId,
        name: result.name,
        state: result.state,
        minReplicaMemoryGb: result.minReplicaMemoryGb,
        maxReplicaMemoryGb: result.maxReplicaMemoryGb,
        numReplicas: result.numReplicas,
        idleScaling: result.idleScaling,
        idleTimeoutMinutes: result.idleTimeoutMinutes
      },
      message: `Scaling updated for service **${result.name || ctx.input.serviceId}**.`
    };
  })
  .build();
