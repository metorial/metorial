import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete Library File',
  key: 'delete_file',
  description: `Permanently delete a file from your AI21 document library.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the file was successfully deleted'),
      fileId: z.string().describe('ID of the deleted file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteFile(ctx.input.fileId);

    return {
      output: {
        deleted: true,
        fileId: ctx.input.fileId
      },
      message: `Deleted file **${ctx.input.fileId}**.`
    };
  })
  .build();
