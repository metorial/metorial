import { SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { spec } from '../spec';

export let deleteUpload = SlateTool.create(spec, {
  name: 'Delete Upload',
  key: 'delete_upload',
  description: `Permanently deletes an upload and all associated data. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      uploadId: z.string().describe('ID of the upload to delete')
    })
  )
  .output(
    z.object({
      uploadId: z.string().describe('ID of the deleted upload'),
      deleted: z.boolean().describe('Whether the upload was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DromoClient({ token: ctx.auth.token });
    await client.deleteUpload(ctx.input.uploadId);

    return {
      output: {
        uploadId: ctx.input.uploadId,
        deleted: true
      },
      message: `Successfully deleted upload **${ctx.input.uploadId}**.`
    };
  })
  .build();
