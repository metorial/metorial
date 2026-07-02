import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { spec } from '../spec';

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieve the details of the ClickHouse Cloud organization, including its name, creation date, private endpoints, and BYOC configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizationId: z.string().describe('Unique identifier of the organization'),
      name: z.string().describe('Name of the organization'),
      createdAt: z.string().describe('ISO-8601 creation timestamp'),
      privateEndpoints: z
        .array(
          z.object({
            endpointId: z.string().optional(),
            cloudProvider: z.string().optional(),
            region: z.string().optional(),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('Private endpoints configured for the organization'),
      byocConfig: z
        .array(
          z.object({
            byocId: z.string().optional(),
            state: z.string().optional(),
            accountName: z.string().optional(),
            regionId: z.string().optional(),
            cloudProvider: z.string().optional(),
            displayName: z.string().optional()
          })
        )
        .optional()
        .describe('BYOC infrastructure configurations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let org = await client.getOrganization();
    let privateEndpoints = Array.isArray(org.privateEndpoints) ? org.privateEndpoints : [];
    let byocConfig = Array.isArray(org.byocConfig) ? org.byocConfig : [];

    return {
      output: {
        organizationId: org.id,
        name: org.name,
        createdAt: org.createdAt,
        privateEndpoints: privateEndpoints.map((endpoint: any) => ({
          endpointId: endpoint.endpointId || endpoint.id,
          cloudProvider: endpoint.cloudProvider,
          region: endpoint.region,
          description: endpoint.description
        })),
        byocConfig: byocConfig.map((config: any) => ({
          byocId: config.byocId || config.id,
          state: config.state,
          accountName: config.accountName,
          regionId: config.regionId,
          cloudProvider: config.cloudProvider,
          displayName: config.displayName
        }))
      },
      message: `Organization **${org.name}** (${org.id}) created at ${org.createdAt}.`
    };
  })
  .build();
