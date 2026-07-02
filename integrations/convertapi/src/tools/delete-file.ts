import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete a file from ConvertAPI's temporary file storage before its automatic 3-hour expiration.
Use this to clean up files after they are no longer needed.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ConvertAPI file ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the file was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.deleteFile(ctx.input.fileId);

    return {
      output: { deleted: true },
      message: `Deleted file \`${ctx.input.fileId}\` from ConvertAPI storage.`
    };
  })
  .build();
