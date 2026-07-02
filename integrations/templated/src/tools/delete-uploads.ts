import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUploads = SlateTool.create(spec, {
  name: 'Delete Uploads',
  key: 'delete_uploads',
  description: `Delete one or more uploaded images by their IDs. Supports bulk deletion in a single request.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      uploadIds: z.array(z.string()).describe('IDs of the uploads to delete')
    })
  )
  .output(
    z.object({
      deletedIds: z.array(z.string()).optional(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.deleteUploads(ctx.input.uploadIds);

    return {
      output: {
        deletedIds: result.deleted,
        message: result.message
      },
      message: `Deleted **${ctx.input.uploadIds.length}** upload(s).`
    };
  })
  .build();
