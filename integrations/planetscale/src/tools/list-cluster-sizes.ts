import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listClusterSizes = SlateTool.create(spec, {
  name: 'List Cluster Sizes',
  key: 'list_cluster_sizes',
  description: `List PlanetScale cluster sizes available to the configured organization. Use this to choose clusterSize values for database creation and backup restores.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      engine: z
        .enum(['mysql', 'postgresql'])
        .optional()
        .describe('Database engine to filter by. Defaults to mysql.'),
      rates: z.boolean().optional().describe('Include pricing rates when available'),
      region: z.string().optional().describe('Region slug to price or filter sizes for')
    })
  )
  .output(
    z.object({
      clusterSizes: z.array(
        z.object({
          name: z.string(),
          displayName: z.string().optional(),
          cpu: z.string().optional(),
          storage: z.number().nullable().optional(),
          ram: z.number().optional(),
          metal: z.boolean().optional(),
          enabled: z.boolean().optional(),
          provider: z.string().nullable().optional(),
          defaultVtgate: z.string().nullable().optional(),
          development: z.boolean().optional(),
          production: z.boolean().optional(),
          replicaRate: z.number().nullable().optional(),
          rate: z.number().nullable().optional(),
          architecture: z.string().nullable().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let clusterSizes = await client.listClusterSizes({
      engine: ctx.input.engine,
      rates: ctx.input.rates,
      region: ctx.input.region
    });

    let mapped = clusterSizes.map((size: any) => ({
      name: size.name,
      displayName: size.display_name,
      cpu: size.cpu,
      storage: size.storage,
      ram: size.ram,
      metal: size.metal,
      enabled: size.enabled,
      provider: size.provider,
      defaultVtgate: size.default_vtgate,
      development: size.development,
      production: size.production,
      replicaRate: size.replica_rate,
      rate: size.rate,
      architecture: size.architecture
    }));

    return {
      output: { clusterSizes: mapped },
      message: `Found **${mapped.length}** PlanetScale cluster size option(s).`
    };
  });
