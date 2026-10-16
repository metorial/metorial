import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportImageMetadataTool = SlateTool.create(spec, {
  name: 'Export Image Metadata',
  key: 'export_image_metadata',
  description:
    'Create a downloadable JSON file with a SmugMug image’s current details and original-file metadata, including the available EXIF fields.',
  tags: { readOnly: true }
})
  .input(z.object({ imageKey: z.string().describe('Image key to export') }))
  .output(z.object({ imageKey: z.string(), filename: z.string(), status: z.string() }))
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let image = await client.getImage(ctx.input.imageKey);
    let metadata = await client.getImageMetadata(ctx.input.imageKey);
    let filename = `image-${image.ImageKey.replace(/[^a-zA-Z0-9_-]/g, '_')}-metadata.json`;
    try {
      await ctx.addAttachment({
        type: 'content',
        content: new Response(`${JSON.stringify({ image, metadata }, null, 2)}\n`, {
          headers: { 'content-type': 'application/json; charset=utf-8' }
        }),
        filename
      });
    } catch {
      throw createApiServiceError(
        'The metadata was retrieved, but the JSON file could not be prepared. Request the export again.',
        { reason: 'file_preparation_failed' }
      );
    }
    return {
      output: { imageKey: image.ImageKey, filename, status: 'prepared' },
      message: 'Prepared the metadata JSON file for download.'
    };
  })
  .build();
