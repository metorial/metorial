import { createApiServiceError, getBase64ByteLength, SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { workspaceId } from '../lib/schemas';
import { spec } from '../spec';

export let uploadMedia = SlateTool.create(spec, {
  name: 'Upload Media File',
  key: 'upload_media',
  description:
    'Upload an image or video to the workspace media library. Use list_media after uploading to find numeric media IDs for post content.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      workspaceId,
      filename: z
        .string()
        .min(1)
        .describe('Name of the uploaded file, including its extension'),
      mimeType: z.string().min(1).describe('File MIME type, such as image/png or video/mp4'),
      contentBase64: z.string().min(1).describe('Base64-encoded binary file content')
    })
  )
  .output(
    z.object({ result: z.unknown().describe('The upload response returned by DotSimple') })
  )
  .handleInvocation(async ctx => {
    let encoded = ctx.input.contentBase64;
    if (
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded) ||
      getBase64ByteLength(encoded) === 0
    ) {
      throw createApiServiceError('Provide nonempty, correctly padded Base64 file content.');
    }
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.input.workspaceId ?? ctx.config.workspaceId
    });
    let result = await client.uploadMedia(
      Buffer.from(encoded, 'base64'),
      ctx.input.filename,
      ctx.input.mimeType
    );
    return { output: { result }, message: 'Uploaded the media file to DotSimple.' };
  })
  .build();
