import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFileMetadata = SlateTool.create(spec, {
  name: 'Get File Metadata',
  key: 'get_file_metadata',
  description: `Retrieve technical metadata for an image including EXIF data, dimensions, format, quality, color profile info, transparency, and perceptual hash (pHash). Lookup by file ID or ImageKit URL.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().optional().describe('File ID to get metadata for'),
      url: z.string().optional().describe('ImageKit URL of the file to get metadata for')
    })
  )
  .output(
    z.object({
      height: z.number().optional().describe('Image height in pixels'),
      width: z.number().optional().describe('Image width in pixels'),
      size: z.number().optional().describe('File size in bytes'),
      format: z.string().optional().describe('Image format, e.g. "jpg", "png"'),
      hasColorProfile: z
        .boolean()
        .optional()
        .describe('Whether the image has an embedded color profile'),
      quality: z.number().optional().describe('Image quality level'),
      density: z.number().optional().describe('Image density in DPI'),
      hasTransparency: z.boolean().optional().describe('Whether the image has transparency'),
      pHash: z.string().optional().describe('Perceptual hash for image similarity comparison'),
      exif: z
        .record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('EXIF metadata including camera info, GPS data, and more')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!ctx.input.fileId && !ctx.input.url) {
      throw new Error('Either fileId or url must be provided');
    }

    let metadata: any;
    if (ctx.input.fileId) {
      metadata = await client.getFileMetadata(ctx.input.fileId);
    } else {
      metadata = await client.getMetadataByUrl(ctx.input.url!);
    }

    return {
      output: {
        height: metadata.height,
        width: metadata.width,
        size: metadata.size,
        format: metadata.format,
        hasColorProfile: metadata.hasColorProfile,
        quality: metadata.quality,
        density: metadata.density,
        hasTransparency: metadata.hasTransparency,
        pHash: metadata.pHash,
        exif: metadata.exif
      },
      message: `Retrieved metadata: **${metadata.width}×${metadata.height}** ${metadata.format}, ${metadata.size} bytes.`
    };
  })
  .build();
