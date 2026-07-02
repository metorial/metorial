import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadMedia = SlateTool.create(spec, {
  name: 'Upload Media',
  key: 'upload_media',
  description: `Upload an image or video file to Ayrshare's media hosting. Returns a publicly accessible URL that can be used in post creation. Accepts Base64 Data URI encoded files.`,
  constraints: [
    'Maximum file size: 30 MB.',
    'Uploaded media is retained for 90 days.',
    'Requires Premium plan or higher.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      file: z.string().describe('Base64 Data URI string (e.g., "data:image/png;base64,...")'),
      fileName: z.string().optional().describe('Name for the uploaded file'),
      description: z.string().optional().describe('Description of the file')
    })
  )
  .output(
    z.object({
      mediaId: z.string().optional().describe('Unique identifier for the uploaded media'),
      url: z.string().describe('Publicly accessible URL of the uploaded media'),
      fileName: z.string().optional().describe('Name of the uploaded file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.uploadMedia({
      file: ctx.input.file,
      fileName: ctx.input.fileName,
      description: ctx.input.description
    });

    return {
      output: {
        mediaId: result.id,
        url: result.url,
        fileName: result.fileName
      },
      message: `Media uploaded successfully. URL: **${result.url}**.`
    };
  })
  .build();
