import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

export let importDatabase = SlateTool.create(spec, {
  name: 'Import Database',
  key: 'import_database',
  description: `Import data into an existing Redis Cloud database from external sources. Supports AWS S3, Google Cloud Storage, Azure Blob Storage, FTP, HTTP, and Redis server sources.
**Warning:** Importing data overwrites any existing data in the target database.`,
  instructions: [
    'sourceType must match the URI scheme: aws-s3, google-blob-storage, azure-blob-storage, ftp, HTTP, or redis.',
    'Import URIs follow provider-specific formats (e.g., s3://bucket/path/file.rdb for AWS S3).'
  ]
})
  .input(
    z.object({
      subscriptionId: z.number().describe('Subscription ID containing the database'),
      databaseId: z.number().describe('Database ID to import data into'),
      type: z.enum(['pro', 'essentials']).default('pro').describe('Subscription type'),
      sourceType: z
        .enum(['aws-s3', 'google-blob-storage', 'azure-blob-storage', 'ftp', 'HTTP', 'redis'])
        .describe('Source type for the import'),
      importFromUri: z
        .array(z.string())
        .describe('URI(s) of the data source(s) to import from')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID to track the import operation'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let body: Record<string, any> = {
      sourceType: ctx.input.sourceType,
      importFromUri: ctx.input.importFromUri
    };

    let result: any;
    if (ctx.input.type === 'essentials') {
      result = await client.importEssentialsDatabase(
        ctx.input.subscriptionId,
        ctx.input.databaseId,
        body
      );
    } else {
      result = await client.importDatabase(
        ctx.input.subscriptionId,
        ctx.input.databaseId,
        body
      );
    }

    let taskId = String(result?.taskId || result?.taskID || '');

    return {
      output: { taskId, raw: result },
      message: `Import into database **${ctx.input.databaseId}** initiated from **${ctx.input.sourceType}**. Task ID: **${taskId}**.`
    };
  })
  .build();
