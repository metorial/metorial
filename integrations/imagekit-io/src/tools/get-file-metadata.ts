import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalid } from '../lib/validation';
import { spec } from '../spec';

export let getFileMetadata = SlateTool.create(spec, {
  name: 'Get File Metadata',
  key: 'get_file_metadata',
  description: `Retrieve available technical metadata for an image, audio, or video, including dimensions, format, EXIF data, duration, bitrate, and codecs. Lookup by file ID or ImageKit URL.`,
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
      bitRate: z.number().optional().describe('Audio or video bitrate when returned'),
      duration: z
        .number()
        .optional()
        .describe('Audio or video duration in seconds when returned'),
      audioCodec: z.string().optional().describe('Audio codec when returned'),
      videoCodec: z.string().optional().describe('Video codec when returned'),
      hasColorProfile: z
        .boolean()
        .optional()
        .describe('Whether the image has an embedded color profile'),
      quality: z.number().optional().describe('Image quality level'),
      density: z.number().optional().describe('Image density in DPI'),
      hasTransparency: z.boolean().optional().describe('Whether the image has transparency'),
      pHash: z.string().optional().describe('Perceptual hash for image similarity comparison'),
      exif: z
        .record(z.string(), z.unknown())
        .optional()
        .nullable()
        .describe('EXIF metadata including camera info, GPS data, and more')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (Boolean(ctx.input.fileId) === Boolean(ctx.input.url)) {
      throw invalid('Provide exactly one of fileId or url.');
    }

    let metadata = ctx.input.fileId
      ? await client.getFileMetadata(ctx.input.fileId)
      : await client.getMetadataByUrl(ctx.input.url!);

    return {
      output: {
        height: metadata.height,
        width: metadata.width,
        size: metadata.size,
        format: metadata.format,
        bitRate: metadata.bitRate,
        duration: metadata.duration,
        audioCodec: metadata.audioCodec,
        videoCodec: metadata.videoCodec,
        hasColorProfile: metadata.hasColorProfile,
        quality: metadata.quality,
        density: metadata.density,
        hasTransparency: metadata.hasTransparency,
        pHash: metadata.pHash,
        exif: metadata.exif
      },
      message: 'Retrieved available technical file metadata.'
    };
  })
  .build();
