import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

export let deleteMediaFiles = SlateTool.create(spec, {
  name: 'Delete Media Files',
  key: 'delete_media_files',
  description: `Delete one or more media files from the workspace by providing their numeric IDs.`,
  constraints: [
    'This action is irreversible. Deleted files cannot be recovered.',
    'Requires numeric media file IDs (not UUIDs).'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      fileIds: z.array(z.number()).min(1).describe('Array of numeric media file IDs to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId
    });

    await client.deleteMediaFiles(ctx.input.fileIds);

    return {
      output: { success: true },
      message: `Successfully deleted **${ctx.input.fileIds.length}** media file(s).`
    };
  })
  .build();
