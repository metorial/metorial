import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

export let getDatabase = SlateTool.create(spec, {
  name: 'Get Database',
  key: 'get_database',
  description: `Retrieve detailed information about a specific Redis Cloud database, including its configuration, endpoints, memory usage, and module settings. Supports both **Pro** and **Essentials** databases.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriptionId: z.number().describe('The subscription ID containing the database'),
      databaseId: z.number().describe('The database ID to retrieve'),
      type: z.enum(['pro', 'essentials']).default('pro').describe('Subscription type')
    })
  )
  .output(
    z.object({
      databaseId: z.number().describe('Unique database identifier'),
      name: z.string().describe('Database name'),
      status: z.string().optional().describe('Current database status'),
      protocol: z.string().optional().describe('Database protocol'),
      provider: z.string().optional().describe('Cloud provider'),
      region: z.string().optional().describe('Deployment region'),
      memoryLimitInGb: z.number().optional().describe('Memory limit in GB'),
      memoryUsedInMb: z.number().optional().describe('Memory used in MB'),
      publicEndpoint: z.string().optional().describe('Public endpoint URL'),
      privateEndpoint: z.string().optional().describe('Private endpoint URL'),
      dataPersistence: z.string().optional().describe('Data persistence setting'),
      replication: z.boolean().optional().describe('Whether replication is enabled'),
      dataEvictionPolicy: z.string().optional().describe('Data eviction policy'),
      raw: z.any().describe('Full database details from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let db: any;

    if (ctx.input.type === 'essentials') {
      db = await client.getEssentialsDatabase(ctx.input.subscriptionId, ctx.input.databaseId);
    } else {
      db = await client.getDatabase(ctx.input.subscriptionId, ctx.input.databaseId);
    }

    return {
      output: {
        databaseId: db.databaseId || db.id,
        name: db.name,
        status: db.status,
        protocol: db.protocol,
        provider: db.provider,
        region: db.region,
        memoryLimitInGb: db.memoryLimitInGb,
        memoryUsedInMb: db.memoryUsedInMb,
        publicEndpoint: db.publicEndpoint,
        privateEndpoint: db.privateEndpoint,
        dataPersistence: db.dataPersistence,
        replication: db.replication,
        dataEvictionPolicy: db.dataEvictionPolicy,
        raw: db
      },
      message: `Database **${db.name}** (ID: ${db.databaseId || db.id}) — status: **${db.status}**.`
    };
  })
  .build();
