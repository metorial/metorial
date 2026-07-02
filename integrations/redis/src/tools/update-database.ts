import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';
import { requireAtLeastOneInputField, subscriptionTypeSchema } from './common';

export let updateDatabase = SlateTool.create(spec, {
  name: 'Update Database',
  key: 'update_database',
  description: `Update an existing Redis Cloud database. Modify name, memory, persistence, replication, eviction policy, modules, and more. Returns a task ID to track the update.`,
  instructions: [
    'Set dryRun to true to estimate costs of the configuration change without applying it.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      subscriptionId: z.number().describe('Subscription ID containing the database'),
      databaseId: z.number().describe('Database ID to update'),
      type: subscriptionTypeSchema,
      dryRun: z.boolean().default(false).describe('Estimate costs without applying changes'),
      name: z.string().optional().describe('New database name'),
      memoryLimitInGb: z.number().optional().describe('New memory limit in GB'),
      datasetSizeInGb: z.number().optional().describe('New dataset size in GB'),
      replication: z.boolean().optional().describe('Enable or disable replication'),
      dataPersistence: z.string().optional().describe('Data persistence type'),
      dataEvictionPolicy: z.string().optional().describe('Data eviction policy'),
      password: z.string().optional().describe('New database access password'),
      supportOSSClusterApi: z
        .boolean()
        .optional()
        .describe('Enable or disable OSS Cluster API'),
      periodicBackupPath: z
        .string()
        .optional()
        .describe('Path for automatic periodic backups'),
      throughputMeasurement: z
        .object({
          by: z.string().optional().describe('Measurement type'),
          value: z.number().optional().describe('Throughput value')
        })
        .optional()
        .describe('Updated throughput settings'),
      alerts: z
        .array(
          z.object({
            name: z.string().describe('Alert name'),
            value: z.number().describe('Alert threshold value')
          })
        )
        .optional()
        .describe('Updated alert configurations')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the asynchronous update'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);

    requireAtLeastOneInputField(
      ctx.input,
      [
        'name',
        'memoryLimitInGb',
        'datasetSizeInGb',
        'replication',
        'dataPersistence',
        'dataEvictionPolicy',
        'password',
        'supportOSSClusterApi',
        'periodicBackupPath',
        'throughputMeasurement',
        'alerts'
      ],
      'Provide at least one database setting to update.'
    );

    let body: Record<string, any> = {};
    if (ctx.input.dryRun) body.dryRun = true;
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.memoryLimitInGb !== undefined)
      body.memoryLimitInGb = ctx.input.memoryLimitInGb;
    if (ctx.input.datasetSizeInGb !== undefined)
      body.datasetSizeInGb = ctx.input.datasetSizeInGb;
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
    if (ctx.input.alerts !== undefined) body.alerts = ctx.input.alerts;

    let result: any;
    if (ctx.input.type === 'essentials') {
      result = await client.updateEssentialsDatabase(
        ctx.input.subscriptionId,
        ctx.input.databaseId,
        body
      );
    } else {
      result = await client.updateDatabase(
        ctx.input.subscriptionId,
        ctx.input.databaseId,
        body
      );
    }

    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: ctx.input.dryRun
        ? `Dry-run for database **${ctx.input.databaseId}** update complete. Task ID: **${taskId}**.`
        : `Database **${ctx.input.databaseId}** update initiated. Task ID: **${taskId}**.`
    };
  })
  .build();
