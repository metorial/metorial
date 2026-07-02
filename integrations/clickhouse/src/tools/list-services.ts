import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { spec } from '../spec';

let serviceEndpointSchema = z.object({
  protocol: z.string().optional(),
  host: z.string().optional(),
  port: z.number().optional()
});

let serviceSummarySchema = z.object({
  serviceId: z.string().describe('Unique service identifier'),
  name: z.string().describe('Name of the service'),
  provider: z.string().optional().describe('Cloud provider (aws, gcp, azure)'),
  region: z.string().optional().describe('Cloud region'),
  state: z.string().optional().describe('Current state (running, stopped, idle, etc.)'),
  clickhouseVersion: z.string().optional().describe('ClickHouse version'),
  numReplicas: z.number().optional().describe('Number of replicas'),
  minReplicaMemoryGb: z.number().optional().describe('Minimum replica memory in GB'),
  maxReplicaMemoryGb: z.number().optional().describe('Maximum replica memory in GB'),
  idleScaling: z.boolean().optional().describe('Whether idle scaling is enabled'),
  endpoints: z.array(serviceEndpointSchema).optional().describe('Service endpoints'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let listServices = SlateTool.create(spec, {
  name: 'List Services',
  key: 'list_services',
  description: `List all ClickHouse services in the organization. Optionally filter services by tags. Returns service names, states, cloud provider, region, scaling configuration, and endpoints.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .array(z.string())
        .optional()
        .describe('Tag-based filter strings (e.g., "tag:env=production")')
    })
  )
  .output(
    z.object({
      services: z.array(serviceSummarySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let services = await client.listServices(ctx.input.filter);
    let items = Array.isArray(services) ? services : [];

    return {
      output: {
        services: items.map((s: any) => ({
          serviceId: s.id,
          name: s.name,
          provider: s.provider,
          region: s.region,
          state: s.state,
          clickhouseVersion: s.clickhouseVersion,
          numReplicas: s.numReplicas,
          minReplicaMemoryGb: s.minReplicaMemoryGb,
          maxReplicaMemoryGb: s.maxReplicaMemoryGb,
          idleScaling: s.idleScaling,
          endpoints: s.endpoints,
          createdAt: s.createdAt
        }))
      },
      message: `Found **${items.length}** services.`
    };
  })
  .build();
