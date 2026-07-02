import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let imageMetadata = SlateTool.create(spec, {
  name: 'Image Metadata',
  key: 'image_metadata',
  description: `Extract metadata from images including format, dimensions, resolution, orientation, EXIF data, and XMP data. Returns detailed image information useful for processing workflows.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded image file content'),
      simplifiedLatLongFormat: z
        .boolean()
        .optional()
        .describe('Use simplified latitude/longitude format')
    })
  )
  .output(
    z.object({
      imageFormat: z.string().optional().describe('Image format'),
      fileSize: z.string().optional().describe('File size in MB'),
      width: z.number().optional().describe('Image width in pixels'),
      height: z.number().optional().describe('Image height in pixels'),
      orientation: z.string().optional().describe('Image orientation'),
      bitsPerPixel: z.number().optional().describe('Bits per pixel'),
      horizontalResolution: z.number().optional().describe('Horizontal resolution (DPI)'),
      verticalResolution: z.number().optional().describe('Vertical resolution (DPI)'),
      hasExifData: z.boolean().optional().describe('Whether EXIF data exists'),
      exifDataJson: z.string().optional().describe('EXIF data as JSON string'),
      hasXmpData: z.boolean().optional().describe('Whether XMP data exists'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.getImageMetadata({
      fileContent: ctx.input.fileContent,
      simplifiedLatLongFormat: ctx.input.simplifiedLatLongFormat || false
    });

    return {
      output: {
        imageFormat: result.imageFormat,
        fileSize: result.fileSize,
        width: result.width,
        height: result.height,
        orientation: result.orientation,
        bitsPerPixel: result.bitsPerPixel,
        horizontalResolution: result.horizontalResolution,
        verticalResolution: result.verticalResolution,
        hasExifData: result.hasExifData,
        exifDataJson: result.exifDataJson,
        hasXmpData: result.hasXmpData,
        operationId: result.OperationId || ''
      },
      message: `Extracted image metadata: **${result.imageFormat}**, ${result.width}x${result.height}px, ${result.fileSize}`
    };
  })
  .build();
