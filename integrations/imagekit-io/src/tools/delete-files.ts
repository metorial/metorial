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
      deletedFileIds: z.array(z.string()).describe('IDs of successfully deleted files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.fileIds.length === 1) {
      await client.deleteFile(ctx.input.fileIds[0]!);
    } else {
      await client.bulkDeleteFiles(ctx.input.fileIds);
    }

    return {
      output: {
        deletedFileIds: ctx.input.fileIds
      },
      message: `Deleted **${ctx.input.fileIds.length}** file(s).`
    };
  })
  .build();
