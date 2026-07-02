import { createBase64Attachment, getBase64ByteLength, SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { spec } from '../spec';

let thumbnailFormatSchema = z.enum(['jpeg', 'png', 'webp']);

export let getThumbnail = SlateTool.create(spec, {
  name: 'Get Thumbnail',
  key: 'get_thumbnail',
  description: `Generate a thumbnail for a Dropbox image file and return it as a Slate attachment.`,
  constraints: [
    'Dropbox thumbnails are supported for common image formats such as jpg, jpeg, png, tiff, gif, webp, ppm, and bmp.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      path: z
        .string()
        .describe('Path or ID of the image file to thumbnail (e.g., "/Photos/image.png")'),
      format: thumbnailFormatSchema
        .optional()
        .describe('Thumbnail image format. Defaults to "jpeg".'),
      size: z
        .enum([
          'w32h32',
          'w64h64',
          'w128h128',
          'w256h256',
          'w480h320',
          'w640h480',
          'w960h640',
          'w1024h768',
          'w2048h1536',
          'w3200h2400'
        ])
        .optional()
        .describe('Requested thumbnail size. Defaults to "w64h64".'),
      mode: z
        .enum(['strict', 'bestfit', 'fitone_bestfit', 'original'])
        .optional()
        .describe('Thumbnail resize mode. Defaults to "strict".'),
      quality: z
        .enum(['quality_80', 'quality_90'])
        .optional()
        .describe('Thumbnail quality. Defaults to "quality_80".'),
      excludeMediaInfo: z
        .boolean()
        .optional()
        .describe('If true, ask Dropbox not to populate media_info metadata')
    })
  )
  .output(
    z.object({
      name: z.string().optional().describe('File name'),
      pathDisplay: z.string().optional().describe('Display path'),
      fileId: z.string().optional().describe('Unique file ID'),
      size: z.number().optional().describe('Source file size in bytes'),
      rev: z.string().optional().describe('File revision'),
      thumbnailMimeType: z.string().describe('MIME type of the returned thumbnail'),
      thumbnailSizeBytes: z.number().describe('Size of the returned thumbnail in bytes')
    })
  )
  .handleInvocation(async ctx => {
    let format = ctx.input.format ?? 'jpeg';
    let client = new DropboxClient(ctx.auth.token);
    let result = await client.getThumbnail(ctx.input.path, {
      format,
      size: ctx.input.size,
      mode: ctx.input.mode,
      quality: ctx.input.quality,
      excludeMediaInfo: ctx.input.excludeMediaInfo
    });
    let mimeType = result.contentType ?? `image/${format === 'jpeg' ? 'jpeg' : format}`;
    let thumbnailSizeBytes = getBase64ByteLength(result.contentBase64);

    return {
      output: {
        name: result.metadata?.name,
        pathDisplay: result.metadata?.path_display,
        fileId: result.metadata?.id,
        size: result.metadata?.size,
        rev: result.metadata?.rev,
        thumbnailMimeType: mimeType,
        thumbnailSizeBytes
      },
      attachments: [createBase64Attachment(result.contentBase64, mimeType)],
      message: `Generated a thumbnail for **${result.metadata?.name || ctx.input.path}**.`
    };
  })
  .build();
