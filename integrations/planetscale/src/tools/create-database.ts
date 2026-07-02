import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDatabase = SlateTool.create(spec, {
  name: 'Create Database',
  key: 'create_database',
  description: `Create a new PlanetScale database. Supports both Vitess (MySQL-compatible) and PostgreSQL engines. Configure the cluster size, region, and high-availability replicas.`,
  constraints: [
    'Database names must be unique within an organization',
    'PostgreSQL databases require specifying kind as "postgresql"'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name for the new database'),
      clusterSize: z.string().describe('Cluster size, e.g. PS_10, PS_20, PS_40'),
      region: z
        .string()
        .optional()
        .describe('Region slug for the database, e.g. us-east, eu-west'),
      replicas: z.number().optional().describe('Number of replicas (0 for non-HA, 2+ for HA)'),
      kind: z
        .enum(['mysql', 'postgresql'])
        .optional()
        .describe('Database engine type (default: mysql)'),
      majorVersion: z.string().optional().describe('Major version for PostgreSQL databases'),
      minimumStorageBytes: z
        .number()
        .optional()
        .describe('Minimum storage size in bytes for databases that support storage bounds'),
      maximumStorageBytes: z
        .number()
        .optional()
        .describe('Maximum storage size in bytes for databases that support storage bounds')
    })
  )
  .output(
    z.object({
      databaseId: z.string(),
      name: z.string(),
      state: z.string(),
      kind: z.string(),
      region: z.string().optional(),
      htmlUrl: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let db = await client.createDatabase({
      name: ctx.input.name,
      clusterSize: ctx.input.clusterSize,
      region: ctx.input.region,
      replicas: ctx.input.replicas,
      kind: ctx.input.kind,
      majorVersion: ctx.input.majorVersion,
      storage: {
        minimumStorageBytes: ctx.input.minimumStorageBytes,
        maximumStorageBytes: ctx.input.maximumStorageBytes
      }
    });

    return {
      output: {
        databaseId: db.id,
        name: db.name,
        state: db.state,
        kind: db.kind || 'mysql',
        region: db.region?.display_name || db.region?.slug,
        htmlUrl: db.html_url,
        createdAt: db.created_at
      },
      message: `Created database **${db.name}** (${db.kind || 'mysql'}) in region ${db.region?.display_name || 'default'}.`
    };
  });
