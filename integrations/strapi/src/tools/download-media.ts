import { getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { download, renew } from '../lib/files';
import { spec } from '../spec';

export const downloadMedia = SlateTool.create(spec, {
  name: 'Download Media',
  key: 'download_media',
  description:
    'Provide a downloadable existing media file by its exact numeric file ID. The file must belong to the connected instance or a trusted storage origin.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      fileId: z
        .number()
        .describe('Exact numeric file ID from get_media, list_media or upload_media')
    })
  )
  .output(
    z.object({
      fileId: z.number(),
      name: z.string(),
      mimeType: z.string(),
      expiresAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await download(Client.fromContext(ctx), ctx.input.fileId);
    await ctx.addAttachment({
      type: 'url',
      url: result.url,
      mimeType: String(result.file.mime),
      filename: String(result.file.name),
      ...(result.reference && result.expiresAt
        ? { refreshReference: result.reference, refreshAt: result.expiresAt }
        : {})
    });
    return {
      output: {
        fileId: ctx.input.fileId,
        name: String(result.file.name),
        mimeType: String(result.file.mime),
        ...(result.expiresAt ? { expiresAt: result.expiresAt } : {})
      },
      message: 'The existing media file is ready to download.'
    };
  })
  .build();
export const getFileUrl = getFileUrlTool(spec, async ctx =>
  renew(Client.fromContext(ctx), ctx.input.reference, ctx.input.url)
);
