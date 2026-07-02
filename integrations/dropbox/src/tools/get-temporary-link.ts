import { SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { spec } from '../spec';

export let getTemporaryLink = SlateTool.create(spec, {
  name: 'Get Temporary Link',
  key: 'get_temporary_link',
  description: `Create a temporary Dropbox streaming link for a file. Dropbox temporary links expire after about four hours.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      path: z
        .string()
        .describe('Path or ID of the file (e.g., "/Documents/video.mp4" or "id:abc123")')
    })
  )
  .output(
    z.object({
      link: z.string().describe('Temporary URL for streaming the file content'),
      expiresInSeconds: z
        .number()
        .describe('Approximate Dropbox temporary link lifetime in seconds'),
      name: z.string().optional().describe('File name'),
      pathDisplay: z.string().optional().describe('Display path'),
      fileId: z.string().optional().describe('Unique file ID'),
      size: z.number().optional().describe('File size in bytes'),
      rev: z.string().optional().describe('File revision')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DropboxClient(ctx.auth.token);
    let result = await client.getTemporaryLink(ctx.input.path);

    return {
      output: {
        link: result.link,
        expiresInSeconds: 4 * 60 * 60,
        name: result.metadata?.name,
        pathDisplay: result.metadata?.path_display,
        fileId: result.metadata?.id,
        size: result.metadata?.size,
        rev: result.metadata?.rev
      },
      message: `Created a temporary link for **${result.metadata?.name || ctx.input.path}**.`
    };
  })
  .build();
