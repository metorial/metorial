import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { spec } from '../spec';

export let createService = SlateTool.create(spec, {
  name: 'Create Service',
  key: 'create_service',
  description: `Create a new ClickHouse Cloud service. Specify the cloud provider, region, scaling settings, and other configuration. The response includes the generated database password — store it securely as it cannot be retrieved later.`,
  instructions: [
    'Per-replica memory must be a multiple of 4 GB, ranging from 8 to 356 GB.',
    'numReplicas range is 1-20 depending on plan and warehouse configuration.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name for the new service'),
      provider: z.enum(['aws', 'gcp', 'azure']).describe('Cloud provider'),
      region: z.string().describe('Cloud region (e.g., us-east-1, europe-west4)'),
      minReplicaMemoryGb: z
        .number()
        .optional()
        .describe('Minimum memory per replica in GB (multiple of 4, range 8-356)'),
      maxReplicaMemoryGb: z
        .number()
        .optional()
        .describe('Maximum memory per replica in GB (multiple of 4, range 8-356)'),
      numReplicas: z.number().optional().describe('Number of replicas (1-20)'),
      idleScaling: z.boolean().optional().describe('Enable idle scaling (default: true)'),
      idleTimeoutMinutes: z.number().optional().describe('Minutes before idling (minimum 5)'),
      ipAccessList: z
        .array(
          z.object({
            source: z.string().describe('IP address or CIDR range'),
            description: z.string().optional().describe('Description of this IP entry')
          })
        )
        .optional()
        .describe('IP allow list entries'),
      releaseChannel: z
        .enum(['slow', 'default', 'fast'])
        .optional()
        .describe('Release channel for ClickHouse updates'),
      byocId: z.string().optional().describe('BYOC infrastructure ID to deploy on'),
      tags: z
        .array(
          z.object({
            key: z.string(),
            value: z.string().nullable().optional()
          })
        )
        .optional()
        .describe('Tags to apply to the service')
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('ID of the created service'),
      name: z.string(),
      state: z.string().optional(),
      password: z.string().optional().describe('Generated database password (store securely)'),
      endpoints: z
        .array(
          z.object({
            protocol: z.string().optional(),
            host: z.string().optional(),
            port: z.number().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      name: ctx.input.name,
      provider: ctx.input.provider,
      region: ctx.input.region
    };

    if (ctx.input.minReplicaMemoryGb !== undefined)
      body.minReplicaMemoryGb = ctx.input.minReplicaMemoryGb;
    if (ctx.input.maxReplicaMemoryGb !== undefined)
      body.maxReplicaMemoryGb = ctx.input.maxReplicaMemoryGb;
    if (ctx.input.numReplicas !== undefined) body.numReplicas = ctx.input.numReplicas;
    if (ctx.input.idleScaling !== undefined) body.idleScaling = ctx.input.idleScaling;
    if (ctx.input.idleTimeoutMinutes !== undefined)
      body.idleTimeoutMinutes = ctx.input.idleTimeoutMinutes;
    if (ctx.input.ipAccessList) body.ipAccessList = ctx.input.ipAccessList;
    if (ctx.input.releaseChannel) body.releaseChannel = ctx.input.releaseChannel;
    if (ctx.input.byocId) body.byocId = ctx.input.byocId;
    if (ctx.input.tags) body.tags = ctx.input.tags;

    let result = await client.createService(body);
    let service = result.service || result;

    return {
      output: {
        serviceId: service.id,
        name: service.name,
        state: service.state,
        password: result.password,
        endpoints: service.endpoints
      },
      message: `Service **${service.name}** (${service.id}) created successfully. State: **${service.state}**.`
    };
  })
  .build();
