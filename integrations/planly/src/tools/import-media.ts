import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let mediaResultSchema = z.object({
  mediaId: z.string().describe('Unique media identifier'),
  contentType: z.string().optional().describe('MIME type of the media'),
  contentLength: z.number().optional().describe('File size in bytes'),
  contentUri: z.string().optional().describe('URL to the media file'),
  thumbnailUri: z.string().optional().describe('URL to the media thumbnail'),
  duration: z.number().nullable().optional().describe('Video duration in seconds'),
  resolution: z.string().nullable().optional().describe('Media resolution'),
  createdAt: z.string().optional().describe('Upload timestamp')
});

export let importMedia = SlateTool.create(spec, {
  name: 'Import Media',
  key: 'import_media',
  description: `Import a media file from a public URL into Planly. The file is downloaded and stored in the team's media library, ready to be attached to scheduled posts. Supports video/mp4, image/png, image/jpeg, and image/webp.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to import media into'),
      url: z.string().describe('Public URL of the media file to import')
    })
  )
  .output(mediaResultSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.importMediaFromUrl(ctx.input.teamId, ctx.input.url);
    let media = result.data || result;

    return {
      output: {
        mediaId: media.id,
        contentType: media.contentType,
        contentLength: media.contentLength,
        contentUri: media.contentUri,
        thumbnailUri: media.thumbnailUri,
        duration: media.duration,
        resolution: media.resolution,
        createdAt: media.createdAt
      },
      message: `Media imported successfully (ID: ${media.id}).`
    };
  });
