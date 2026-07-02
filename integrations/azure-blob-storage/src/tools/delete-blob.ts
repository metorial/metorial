import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteBlob = SlateTool.create(spec, {
  name: 'Delete Blob',
  key: 'delete_blob',
  description: `Permanently delete a blob from a container. Can optionally delete associated snapshots. Use "include" to delete the blob and all its snapshots, or "only" to delete just the snapshots.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      containerName: z.string().describe('Name of the container'),
      blobName: z.string().describe('Full name/path of the blob to delete'),
      deleteSnapshots: z
        .enum(['include', 'only'])
        .optional()
        .describe('"include" to delete blob + snapshots, "only" to delete snapshots only')
    })
  )
  .output(
    z.object({
      containerName: z.string().describe('Container the blob was deleted from'),
      blobName: z.string().describe('Name of the deleted blob'),
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    await client.deleteBlob(ctx.input.containerName, ctx.input.blobName, {
      deleteSnapshots: ctx.input.deleteSnapshots
    });

    return {
      output: {
        containerName: ctx.input.containerName,
        blobName: ctx.input.blobName,
        success: true
      },
      message: `Blob **${ctx.input.blobName}** deleted from container **${ctx.input.containerName}**${ctx.input.deleteSnapshots ? ` (snapshots: ${ctx.input.deleteSnapshots})` : ''}.`
    };
  })
  .build();
