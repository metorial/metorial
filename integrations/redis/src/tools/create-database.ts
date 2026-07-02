import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';
import { requireInputFields, subscriptionTypeSchema } from './common';

export let createDatabase = SlateTool.create(spec, {
  name: 'Create Database',
  key: 'create_database',
  description: `Create a new Redis Cloud database within an existing subscription. Configure dataset size, persistence, replication, modules, and throughput settings. Returns a task ID to track creation.`,
  instructions: [
    'For Pro databases, name and datasetSizeInGb are required.',
    'For Essentials databases, only name is required.',
    'Set dryRun to true to get a cost estimate without creating the database.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      subscriptionId: z.number().describe('Subscription ID to create the database in'),
      type: subscriptionTypeSchema,
      name: z.string().describe('Database name (alphanumeric and hyphens only)'),
      dryRun: z
        .boolean()
        .default(false)
        .describe('Estimate costs without creating the database'),
      protocol: z.string().optional().describe('Database protocol (e.g., redis, memcached)'),
      datasetSizeInGb: z
        .number()
        .optional()
        .describe('Maximum dataset size in GB (required for Pro)'),
      memoryLimitInGb: z.number().optional().describe('Memory limit in GB'),
      replication: z.boolean().optional().describe('Enable replication'),
      dataPersistence: z
        .string()
        .optional()
        .describe(
          'Data persistence type (e.g., none, aof-every-1-second, snapshot-every-1-hour)'
        ),
      dataEvictionPolicy: z
        .string()
        .optional()
        .describe('Data eviction policy (e.g., volatile-lru, noeviction)'),
      password: z.string().optional().describe('Database access password'),
      supportOSSClusterApi: z.boolean().optional().describe('Enable OSS Cluster API support'),
      periodicBackupPath: z
        .string()
        .optional()
        .describe('Path for automatic periodic backups'),
      throughputMeasurement: z
        .object({
          by: z.string().optional().describe('Measurement type (e.g., operations-per-second)'),
          value: z.number().optional().describe('Throughput value')
        })
        .optional()
        .describe('Throughput settings'),
      modules: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                'Module name (e.g., RedisJSON, RediSearch, RedisBloom, RedisTimeSeries)'
              )
          })
        )
        .optional()
        .describe('Redis modules to enable'),
      alerts: z
        .array(
          z.object({
            name: z.string().describe('Alert name'),
            value: z.number().describe('Alert threshold value')
          })
        )
        .optional()
        .describe('Alert configurations')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the asynchronous creation'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);

    if (ctx.input.type === 'pro') {
      requireInputFields(
        ctx.input,
        ['datasetSizeInGb'],
        'datasetSizeInGb is required when creating a Pro database.'
      );
    }

    let body: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.dryRun) body.dryRun = true;
    if (ctx.input.protocol !== undefined) body.protocol = ctx.input.protocol;
    if (ctx.input.datasetSizeInGb !== undefined)
      body.datasetSizeInGb = ctx.input.datasetSizeInGb;
    if (ctx.input.memoryLimitInGb !== undefined)
      body.memoryLimitInGb = ctx.input.memoryLimitInGb;
    if (ctx.input.replication !== undefined) body.replication = ctx.input.replication;
    if (ctx.input.dataPersistence !== undefined)
      body.dataPersistence = ctx.input.dataPersistence;
    if (ctx.input.dataEvictionPolicy !== undefined)
      body.dataEvictionPolicy = ctx.input.dataEvictionPolicy;
    if (ctx.input.password !== undefined) body.password = ctx.input.password;
    if (ctx.input.supportOSSClusterApi !== undefined)
      body.supportOSSClusterApi = ctx.input.supportOSSClusterApi;
    if (ctx.input.periodicBackupPath !== undefined)
      body.periodicBackupPath = ctx.input.periodicBackupPath;
    if (ctx.input.throughputMeasurement !== undefined)
      body.throughputMeasurement = ctx.input.throughputMeasurement;
    if (ctx.input.modules !== undefined) body.modules = ctx.input.modules;
    if (ctx.input.alerts !== undefined) body.alerts = ctx.input.alerts;

    let result: any;
    if (ctx.input.type === 'essentials') {
      result = await client.createEssentialsDatabase(ctx.input.subscriptionId, body);
    } else {
      result = await client.createDatabase(ctx.input.subscriptionId, body);
    }

    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: ctx.input.dryRun
        ? `Dry-run complete for database **${ctx.input.name}**. Task ID: **${taskId}**.`
        : `Database **${ctx.input.name}** creation initiated. Task ID: **${taskId}**.`
    };
  })
  .build();
