import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let uploadAsset = SlateTool.create(spec, {
  name: 'Upload Asset',
  key: 'upload_asset',
  description: `Upload an image, video, or raw file to Cloudinary from a remote URL or base64-encoded data. Supports configuring the public ID, folder, tags, context metadata, and incoming transformations at upload time.`,
  instructions: [
    'The file parameter accepts a remote HTTP/HTTPS URL, a base64 data URI, an S3 URL, or other supported remote sources.',
    'Set resourceType to "auto" to let Cloudinary detect the file type automatically.'
  ],
  tags: {
    destructive: false,
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
        .describe(
          'Eager transformations to generate asynchronously (e.g., "w_200,h_200,c_crop").'
        ),
      format: z
        .string()
        .optional()
        .describe('Force a specific output format (e.g., "png", "webp").')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('Immutable unique asset identifier.'),
      publicId: z.string().describe('Public ID of the uploaded asset.'),
      version: z.number().describe('Version number of the asset.'),
      format: z.string().describe('File format of the uploaded asset.'),
      resourceType: z.string().describe('Resource type (image, video, raw).'),
      createdAt: z.string().describe('Timestamp when the asset was created.'),
      bytes: z.number().describe('File size in bytes.'),
      width: z.number().optional().describe('Width in pixels (images/videos).'),
      height: z.number().optional().describe('Height in pixels (images/videos).'),
      url: z.string().describe('HTTP URL for accessing the asset.'),
      secureUrl: z.string().describe('HTTPS URL for accessing the asset.'),
      tags: z.array(z.string()).describe('Tags assigned to the asset.'),
      folder: z.string().describe('Folder path of the asset.'),
      originalFilename: z
        .string()
        .optional()
        .describe('Original filename of the uploaded file.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.upload({
      file: ctx.input.file,
      resourceType: ctx.input.resourceType,
      publicId: ctx.input.publicId,
      folder: ctx.input.folder,
      assetFolder: ctx.input.assetFolder,
      displayName: ctx.input.displayName,
      tags: ctx.input.tags,
      context: ctx.input.context,
      metadata: ctx.input.metadata,
      transformation: ctx.input.transformation,
      overwrite: ctx.input.overwrite,
      eager: ctx.input.eager,
      format: ctx.input.format
    });

    return {
      output: {
        assetId: result.assetId,
        publicId: result.publicId,
        version: result.version,
        format: result.format,
        resourceType: result.resourceType,
        createdAt: result.createdAt,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        url: result.url,
        secureUrl: result.secureUrl,
        tags: result.tags,
        folder: result.folder,
        originalFilename: result.originalFilename
      },
      message: `Uploaded asset **${result.publicId}** (${result.format}, ${result.bytes} bytes). Available at: ${result.secureUrl}`
    };
  })
  .build();
