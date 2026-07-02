import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteFileTool = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Permanently delete a file or folder from Google Drive. This action is irreversible. To move a file to trash instead (recoverable), use the **Update File** tool with \`trashed: true\`.`,
  tags: {
    destructive: true
  }
})
  .scopes(googleDriveActionScopes.deleteFile)
  .input(
    z.object({
      fileId: z.string().describe('ID of the file or folder to permanently delete')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ID of the deleted file'),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    await client.deleteFile(ctx.input.fileId);

    return {
      output: {
        fileId: ctx.input.fileId,
        deleted: true
      },
      message: `Permanently deleted file \`${ctx.input.fileId}\`.`
    };
  })
  .build();
