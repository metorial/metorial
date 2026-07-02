import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

export let backupDatabase = SlateTool.create(spec, {
  name: 'Backup Database',
  key: 'backup_database',
  description: `Trigger a backup of a Redis Cloud database. The backup is stored in RDB format at the configured backup path or an ad-hoc path. Returns a task ID to track backup progress.`,
  instructions: [
    'The database must have a periodicBackupPath configured, or provide an adhocBackupPath.',
    'Backup targets can be AWS S3, Google Cloud Storage, Azure Blob Storage, or FTP.'
  ],
  constraints: ['Maximum 4 simultaneous database backups per cluster.']
})
  .input(
    z.object({
      subscriptionId: z.number().describe('Subscription ID containing the database'),
      databaseId: z.number().describe('Database ID to back up'),
      type: z.enum(['pro', 'essentials']).default('pro').describe('Subscription type'),
      adhocBackupPath: z
        .string()
        .optional()
        .describe('One-time backup path (overrides the configured periodic backup path)')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the backup operation'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let body: Record<string, any> = {};
    if (ctx.input.adhocBackupPath) body.adhocBackupPath = ctx.input.adhocBackupPath;

    let result: any;
    if (ctx.input.type === 'essentials') {
      result = await client.backupEssentialsDatabase(
        ctx.input.subscriptionId,
        ctx.input.databaseId,
        body
      );
    } else {
      result = await client.backupDatabase(
        ctx.input.subscriptionId,
        ctx.input.databaseId,
        body
      );
    }

    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `Backup initiated for database **${ctx.input.databaseId}**. Task ID: **${taskId}**.`
    };
  })
  .build();
