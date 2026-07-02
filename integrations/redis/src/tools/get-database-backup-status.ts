import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';
import { extractTaskState, subscriptionTypeSchema, taskStateSchema } from './common';

export let getDatabaseBackupStatus = SlateTool.create(spec, {
  name: 'Get Database Backup Status',
  key: 'get_database_backup_status',
  description: `Retrieve the latest Redis Cloud backup task status for a database. Supports Pro and Essentials databases.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriptionId: z.number().describe('Subscription ID containing the database'),
      databaseId: z.number().describe('Database ID to check'),
      type: subscriptionTypeSchema,
      regionName: z
        .string()
        .optional()
        .describe('Region name for Pro Active-Active database backup status')
    })
  )
  .output(taskStateSchema)
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let task =
      ctx.input.type === 'essentials'
        ? await client.getEssentialsDatabaseBackupStatus(
            ctx.input.subscriptionId,
            ctx.input.databaseId
          )
        : await client.getDatabaseBackupStatus(
            ctx.input.subscriptionId,
            ctx.input.databaseId,
            {
              regionName: ctx.input.regionName
            }
          );

    let output = extractTaskState(task);

    return {
      output,
      message: `Backup status for database **${ctx.input.databaseId}** is **${output.status || 'unknown'}**.`
    };
  })
  .build();
