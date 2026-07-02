import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMedia = SlateTool.create(spec, {
  name: 'Delete Media',
  key: 'delete_media',
  description: `Permanently delete a file from the Strapi media library by its ID.`,
  constraints: [
    'This action is irreversible. Any content entries referencing this file will lose their media association.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      fileId: z.number().describe('Numeric ID of the media file to delete')
    })
  )
  .output(
    z.object({
      deletedFile: z.record(z.string(), z.any()).optional().describe('The deleted file data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.deleteFile(ctx.input.fileId);

    return {
      output: {
        deletedFile: result
      },
      message: `Deleted media file **${ctx.input.fileId}**.`
    };
  })
  .build();
