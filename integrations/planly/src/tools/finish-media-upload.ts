import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let finishMediaUpload = SlateTool.create(spec, {
  name: 'Finish Media Upload',
  key: 'finish_media_upload',
  description: `Complete a media file upload after the file has been transferred to the pre-signed URL. This is step 2 of 2 for direct file uploads. Call this after successfully PUTting the file to the URL from "Start Media Upload".`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mediaId: z.string().describe('Media ID returned from "Start Media Upload"')
    })
  )
  .output(
    z.object({
      mediaId: z.string().describe('Confirmed media identifier'),
      contentType: z.string().optional().describe('MIME type of the uploaded file'),
      contentLength: z.number().optional().describe('File size in bytes'),
      contentUri: z.string().optional().describe('URL to the media file'),
      thumbnailUri: z.string().optional().describe('URL to the media thumbnail'),
      duration: z.number().nullable().optional().describe('Video duration in seconds'),
      resolution: z.string().nullable().optional().describe('Media resolution'),
      createdAt: z.string().optional().describe('Upload timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.finishUpload(ctx.input.mediaId);
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
      message: `Upload completed successfully. Media ID: ${media.id}.`
    };
  });
