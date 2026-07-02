import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

export let getMediaFile = SlateTool.create(spec, {
  name: 'Get Media File',
  key: 'get_media_file',
  description: `Retrieve details of a specific media file by its UUID, including metadata, URL, and file information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fileUuid: z.string().describe('UUID of the media file to retrieve')
    })
  )
  .output(
    z.object({
      fileId: z.number().optional().describe('Numeric ID of the media file'),
      fileUuid: z.string().optional().describe('UUID of the media file'),
      name: z.string().optional().describe('File name'),
      mimeType: z.string().optional().describe('MIME type of the file'),
      type: z.string().optional().describe('File type (image, video)'),
      url: z.string().optional().describe('URL of the media file'),
      thumbUrl: z.string().optional().describe('Thumbnail URL'),
      isVideo: z.boolean().optional().describe('Whether the file is a video'),
      createdAt: z.string().optional().describe('Upload timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.getMediaFile(ctx.input.fileUuid);

    return {
      output: {
        fileId: result?.id,
        fileUuid: result?.uuid,
        name: result?.name,
        mimeType: result?.mime_type,
        type: result?.type,
        url: result?.url,
        thumbUrl: result?.thumb_url,
        isVideo: result?.is_video,
        createdAt: result?.created_at
      },
      message: `Retrieved media file **${result?.name ?? ctx.input.fileUuid}** (${result?.mime_type ?? 'unknown type'}).`
    };
  })
  .build();
