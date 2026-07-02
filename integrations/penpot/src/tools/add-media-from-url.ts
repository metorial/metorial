import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addMediaFromUrlTool = SlateTool.create(spec, {
  name: 'Add Media from URL',
  key: 'add_media_from_url',
  description: `Upload a media asset (image) to a design file from a URL. The image will be downloaded and stored as a media object in the file.`
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to add the media to'),
      url: z.string().describe('URL of the image to import'),
      name: z.string().optional().describe('Name for the media object'),
      isLocal: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether the media is local to this file or available as a library asset')
    })
  )
  .output(
    z.object({
      mediaId: z.string().describe('ID of the created media object'),
      name: z.string().optional().describe('Name of the media object'),
      width: z.number().optional().describe('Width of the image'),
      height: z.number().optional().describe('Height of the image'),
      mtype: z.string().optional().describe('MIME type of the media')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let result = await client.createFileMediaObjectFromUrl(
      ctx.input.fileId,
      ctx.input.url,
      ctx.input.isLocal ?? true,
      ctx.input.name
    );

    return {
      output: {
        mediaId: result.id,
        name: result.name,
        width: result.width,
        height: result.height,
        mtype: result.mtype
      },
      message: `Added media **${result.name ?? 'image'}** to the file.`
    };
  })
  .build();
