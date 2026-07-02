import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadMedia = SlateTool.create(spec, {
  name: 'Upload Media',
  key: 'upload_media',
  description: `Upload a file to the Strapi media library from a URL. Optionally set alternative text, caption, and a custom name for the file.`,
  instructions: [
    'Provide a publicly accessible URL for the file to upload.',
    'The fileName should include a file extension (e.g., "photo.jpg").'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      fileUrl: z.string().describe('Publicly accessible URL of the file to upload'),
      fileName: z.string().describe('File name including extension (e.g., "photo.jpg")'),
      name: z.string().optional().describe('Display name for the file in the media library'),
      alternativeText: z.string().optional().describe('Alternative text for accessibility'),
      caption: z.string().optional().describe('Caption for the file')
    })
  )
  .output(
    z.object({
      files: z.array(z.record(z.string(), z.any())).describe('Uploaded file(s) details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let fileInfo: { name?: string; alternativeText?: string; caption?: string } = {};
    if (ctx.input.name) fileInfo.name = ctx.input.name;
    if (ctx.input.alternativeText) fileInfo.alternativeText = ctx.input.alternativeText;
    if (ctx.input.caption) fileInfo.caption = ctx.input.caption;

    let result = await client.uploadFileFromUrl(
      ctx.input.fileUrl,
      ctx.input.fileName,
      Object.keys(fileInfo).length > 0 ? fileInfo : undefined
    );

    return {
      output: {
        files: Array.isArray(result) ? result : [result]
      },
      message: `Uploaded **${ctx.input.fileName}** to the media library.`
    };
  })
  .build();
