import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { resourceSchema } from '../lib/types';
import { spec } from '../spec';

export let uploadAsset = SlateTool.create(spec, {
  name: 'Upload Asset',
  key: 'upload_asset',
  description: `Upload an image, video, or raw file to Cloudinary from a remote URL or base64-encoded data. Supports configuring the public ID, folder, tags, context metadata, and incoming transformations at upload time.`,
  instructions: [
    'The file parameter accepts a remote HTTP/HTTPS URL, a base64 data URI, an S3 URL, or other supported remote sources.',
    'Uploads and transformations consume usage; overwrites and configured notifications may retain effects.',
    'Set resourceType to "auto" to let Cloudinary detect the file type automatically.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      file: z
        .string()
        .describe(
          'The file to upload. Accepts a remote URL (HTTP/HTTPS), base64 data URI (data:...), or S3 URI.'
        ),
      resourceType: z
        .enum(['image', 'video', 'raw', 'auto'])
        .default('auto')
        .describe('The type of file being uploaded.'),
      publicId: z
        .string()
        .optional()
        .describe(
          'Custom public ID for the asset. If not provided, Cloudinary will generate one.'
        ),
      folder: z
        .string()
        .optional()
        .describe('Folder path to upload the asset into (fixed folder mode).'),
      assetFolder: z
        .string()
        .optional()
        .describe('Asset folder for the uploaded file (dynamic folder mode).'),
      displayName: z.string().optional().describe('Display name for the asset.'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the uploaded asset.'),
      context: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs of contextual metadata to attach.'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs of structured metadata to attach.'),
      transformation: z
        .string()
        .optional()
        .describe('Incoming transformation to apply on upload (e.g., "w_400,h_300,c_fill").'),
      overwrite: z
        .boolean()
        .optional()
        .describe('Whether to overwrite an existing asset with the same public ID.'),
      eager: z
        .string()
        .optional()
        .describe('Eager transformations to generate (e.g., "w_200,h_200,c_crop").'),
      format: z
        .string()
        .optional()
        .describe('Force a specific output format (e.g., "png", "webp").')
    })
  )
  .output(resourceSchema)
  .handleInvocation(async ctx => {
    const result = await createClient(ctx).upload(ctx.input);
    return {
      output: result,
      message: `Uploaded asset **${result.publicId}**. Uploads, transformations, overwrites and configured notifications may consume usage or retain effects.`
    };
  })
  .build();
