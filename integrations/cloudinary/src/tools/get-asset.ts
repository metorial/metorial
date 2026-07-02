import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let getAsset = SlateTool.create(spec, {
  name: 'Get Asset Details',
  key: 'get_asset',
  description: `Retrieve full details of a single Cloudinary asset by its public ID or asset ID. Returns all metadata, tags, context, dimensions, and delivery URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publicId: z
        .string()
        .optional()
        .describe('Public ID of the asset to retrieve. Provide either publicId or assetId.'),
      assetId: z
        .string()
        .optional()
        .describe('Immutable asset ID to retrieve. Provide either publicId or assetId.'),
      resourceType: z
        .enum(['image', 'video', 'raw'])
        .default('image')
        .describe('Resource type of the asset. Only needed when using publicId.'),
      type: z
        .enum(['upload', 'fetch', 'private', 'authenticated'])
        .default('upload')
        .describe('Delivery type of the asset. Only needed when using publicId.')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('Immutable unique asset identifier.'),
      publicId: z.string().describe('Public ID of the asset.'),
      format: z.string().describe('File format.'),
      version: z.number().describe('Current version number.'),
      resourceType: z.string().describe('Resource type.'),
      type: z.string().describe('Delivery type.'),
      createdAt: z.string().describe('Creation timestamp.'),
      bytes: z.number().describe('File size in bytes.'),
      width: z.number().optional().describe('Width in pixels.'),
      height: z.number().optional().describe('Height in pixels.'),
      folder: z.string().describe('Folder path.'),
      assetFolder: z.string().optional().describe('Asset folder (dynamic folder mode).'),
      displayName: z.string().optional().describe('Display name.'),
      url: z.string().describe('HTTP delivery URL.'),
      secureUrl: z.string().describe('HTTPS delivery URL.'),
      tags: z.array(z.string()).optional().describe('Tags assigned to the asset.'),
      context: z
        .record(z.string(), z.string())
        .optional()
        .describe('Contextual metadata key-value pairs.'),
      metadata: z.record(z.string(), z.any()).optional().describe('Structured metadata.'),
      accessMode: z.string().optional().describe('Access mode of the asset.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let resource: any;
    if (ctx.input.assetId) {
      resource = await client.getResourceByAssetId(ctx.input.assetId);
    } else if (ctx.input.publicId) {
      resource = await client.getResource(
        ctx.input.publicId,
        ctx.input.resourceType,
        ctx.input.type
      );
    } else {
      throw new Error('Either publicId or assetId must be provided.');
    }

    return {
      output: {
        assetId: resource.assetId,
        publicId: resource.publicId,
        format: resource.format,
        version: resource.version,
        resourceType: resource.resourceType,
        type: resource.type,
        createdAt: resource.createdAt,
        bytes: resource.bytes,
        width: resource.width,
        height: resource.height,
        folder: resource.folder,
        assetFolder: resource.assetFolder,
        displayName: resource.displayName,
        url: resource.url,
        secureUrl: resource.secureUrl,
        tags: resource.tags,
        context: resource.context,
        metadata: resource.metadata,
        accessMode: resource.accessMode
      },
      message: `Retrieved asset **${resource.publicId}** (${resource.format}, ${resource.bytes} bytes, ${resource.width ?? '?'}x${resource.height ?? '?'}).`
    };
  })
  .build();
