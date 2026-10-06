import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteFiles = SlateTool.create(spec, {
  name: 'Delete Files',
  key: 'delete_files',
  description: `Delete one or more files from the ImageKit Media Library by their file IDs. Supports both single and bulk deletion. Note: deleting files does **not** automatically purge the CDN cache.`,
  constraints: [
    'Deleting files does not purge CDN cache — use the Purge Cache tool separately if needed.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      fileIds: z.array(z.string()).min(1).describe('One or more file IDs to delete')
    })
  )
  .output(
    z.object({
      deletedFileIds: z.array(z.string()).describe('IDs of successfully deleted files'),
      unconfirmedFileIds: z
        .array(z.string())
        .optional()
        .describe('Requested IDs whose deletion was not confirmed'),
      errors: z
        .array(z.object({ fileId: z.string(), error: z.string() }))
        .optional()
        .describe('Per-file failures')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let deletedFileIds: string[],
      unconfirmedFileIds: string[] = [],
      errors: Array<{ fileId: string; error: string }> = [];
    if (ctx.input.fileIds.length === 1) {
      await client.deleteFile(ctx.input.fileIds[0]!);
      deletedFileIds = ctx.input.fileIds;
    } else {
      const result = await client.bulkDeleteFiles(ctx.input.fileIds);
      deletedFileIds = result.successfulFileIds;
      unconfirmedFileIds = result.unconfirmedFileIds;
      errors = result.errors;
    }

    return {
      output: {
        deletedFileIds,
        unconfirmedFileIds,
        errors
      },
      message: `Confirmed deletion of **${deletedFileIds.length}** file(s); **${unconfirmedFileIds.length}** requested file(s) remain unconfirmed. Cached copies may remain accessible.`
    };
  })
  .build();
