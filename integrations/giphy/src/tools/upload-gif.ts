import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadGif = SlateTool.create(spec, {
  name: 'Upload GIF',
  key: 'upload_gif',
  description: `Upload a GIF or video to GIPHY from a URL. Supports tagging and linking back to a source post. Production upload keys require a GIPHY Channel username.`,
  constraints: [
    'Files up to 100MB are supported.',
    'Production upload keys require a GIPHY Channel Username.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceImageUrl: z.string().describe('URL of the GIF or video to upload'),
      tags: z.string().optional().describe('Comma-separated tags to attach to the upload'),
      sourcePostUrl: z.string().optional().describe('URL of the original content source'),
      username: z
        .string()
        .optional()
        .describe('GIPHY Channel username (required for production upload keys)')
    })
  )
  .output(
    z.object({
      gifId: z.string().describe('GIPHY ID of the uploaded GIF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.uploadGif({
      sourceImageUrl: ctx.input.sourceImageUrl,
      tags: ctx.input.tags,
      sourcePostUrl: ctx.input.sourcePostUrl,
      username: ctx.input.username
    });

    return {
      output: { gifId: result.gifId },
      message: `Uploaded GIF successfully. GIPHY ID: **${result.gifId}**`
    };
  })
  .build();
