import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';
import { extractTaskState, subscriptionTypeSchema, taskStateSchema } from './common';

export let getDatabaseImportStatus = SlateTool.create(spec, {
  name: 'Get Database Import Status',
  key: 'get_database_import_status',
  description: `Retrieve the latest Redis Cloud import task status for a database. Supports Pro and Essentials databases.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriptionId: z.number().describe('Subscription ID containing the database'),
      databaseId: z.number().describe('Database ID to check'),
      type: subscriptionTypeSchema
    })
  )
  .output(taskStateSchema)
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let task =
      ctx.input.type === 'essentials'
        ? await client.getEssentialsDatabaseImportStatus(
            ctx.input.subscriptionId,
            ctx.input.databaseId
          )
        : await client.getDatabaseImportStatus(ctx.input.subscriptionId, ctx.input.databaseId);

    let output = extractTaskState(task);

    return {
      output,
      message: `Import status for database **${ctx.input.databaseId}** is **${output.status || 'unknown'}**.`
    };
  })
  .build();
