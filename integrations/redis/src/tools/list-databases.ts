import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

let databaseSchema = z.object({
  databaseId: z.number().describe('Unique database identifier'),
  name: z.string().describe('Database name'),
  status: z.string().optional().describe('Current database status'),
  protocol: z.string().optional().describe('Database protocol'),
  provider: z.string().optional().describe('Cloud provider'),
  region: z.string().optional().describe('Deployment region'),
  memoryLimitInGb: z.number().optional().describe('Memory limit in GB'),
  memoryUsedInMb: z.number().optional().describe('Memory currently used in MB'),
  publicEndpoint: z.string().optional().describe('Public endpoint URL'),
  privateEndpoint: z.string().optional().describe('Private endpoint URL')
});

export let listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description: `List all databases within a Redis Cloud subscription. Returns database IDs, names, status, endpoints, and memory usage. Supports both **Pro** and **Essentials** subscriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriptionId: z.number().describe('The subscription ID to list databases for'),
      type: z.enum(['pro', 'essentials']).default('pro').describe('Subscription type')
    })
  )
  .output(
    z.object({
      databases: z.array(databaseSchema).describe('List of databases in the subscription')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let data: any;

    if (ctx.input.type === 'essentials') {
      data = await client.listEssentialsDatabases(ctx.input.subscriptionId);
    } else {
      data = await client.listDatabases(ctx.input.subscriptionId);
    }

    let rawDbs = data?.subscription?.[0]?.databases || data?.databases || [];
    if (!Array.isArray(rawDbs)) rawDbs = [];

    let databases = rawDbs.map((db: any) => ({
      databaseId: db.databaseId || db.id,
      name: db.name,
      status: db.status,
      protocol: db.protocol,
      provider: db.provider,
      region: db.region,
      memoryLimitInGb: db.memoryLimitInGb,
      memoryUsedInMb: db.memoryUsedInMb,
      publicEndpoint: db.publicEndpoint,
      privateEndpoint: db.privateEndpoint
    }));

    return {
      output: { databases },
      message: `Found **${databases.length}** database(s) in subscription **${ctx.input.subscriptionId}**.`
    };
  })
  .build();
