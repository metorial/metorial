import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMedia = SlateTool.create(spec, {
  name: 'Get Media File',
  key: 'get_media',
  description: `Retrieve details of a specific media file from the Strapi media library by its ID. Returns file metadata including URL, dimensions, format, alternative text, and caption.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.number().describe('Numeric ID of the media file')
    })
  )
  .output(
    z.object({
      file: z.record(z.string(), z.any()).describe('Media file details and metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let file = await client.getFile(ctx.input.fileId);

    return {
      output: {
        file
      },
      message: `Retrieved media file **${file?.name ?? ctx.input.fileId}**.`
    };
  })
  .build();
