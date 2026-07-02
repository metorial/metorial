import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateMedia = SlateTool.create(spec, {
  name: 'Update Media Info',
  key: 'update_media',
  description: `Update the metadata of an existing file in the Strapi media library. Change the file name, alternative text, or caption without re-uploading the file.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      fileId: z.number().describe('Numeric ID of the media file to update'),
      name: z.string().optional().describe('New display name for the file'),
      alternativeText: z
        .string()
        .optional()
        .describe('New alternative text for accessibility'),
      caption: z.string().optional().describe('New caption for the file')
    })
  )
  .output(
    z.object({
      file: z.record(z.string(), z.any()).describe('The updated file details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let fileInfo: { name?: string; alternativeText?: string; caption?: string } = {};
    if (ctx.input.name !== undefined) fileInfo.name = ctx.input.name;
    if (ctx.input.alternativeText !== undefined)
      fileInfo.alternativeText = ctx.input.alternativeText;
    if (ctx.input.caption !== undefined) fileInfo.caption = ctx.input.caption;

    let result = await client.updateFileInfo(ctx.input.fileId, fileInfo);

    return {
      output: {
        file: result
      },
      message: `Updated metadata for media file **${ctx.input.fileId}**.`
    };
  })
  .build();
