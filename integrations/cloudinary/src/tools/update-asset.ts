import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let updateAsset = SlateTool.create(spec, {
  name: 'Update Asset',
  key: 'update_asset',
  description: `Update properties of an existing Cloudinary asset. Can modify tags, contextual metadata, structured metadata, display name, asset folder, access control, and moderation status. Can also rename the asset's public ID.`,
  instructions: [
    'To rename an asset, provide both publicId and newPublicId.',
    'To update metadata or tags without renaming, omit newPublicId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      publicId: z.string().describe('Public ID of the asset to update.'),
      resourceType: z
        .enum(['image', 'video', 'raw'])
        .default('image')
        .describe('Resource type of the asset.'),
      type: z
        .enum(['upload', 'fetch', 'private', 'authenticated'])
        .default('upload')
        .describe('Delivery type of the asset.'),
      newPublicId: z.string().optional().describe('New public ID to rename the asset to.'),
      overwriteOnRename: z
        .boolean()
        .optional()
        .describe('Whether to overwrite an existing asset when renaming.'),
      tags: z.array(z.string()).optional().describe('Replace existing tags with these tags.'),
      context: z
        .record(z.string(), z.string())
        .optional()
        .describe('Contextual metadata key-value pairs to set.'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Structured metadata key-value pairs to set.'),
      displayName: z.string().optional().describe('New display name for the asset.'),
      assetFolder: z.string().optional().describe('New asset folder (dynamic folder mode).'),
      moderationStatus: z
        .enum(['approved', 'rejected', 'pending'])
        .optional()
        .describe('Update moderation status.')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('Immutable unique asset identifier.'),
      publicId: z.string().describe('Public ID of the asset.'),
      format: z.string().describe('File format.'),
      resourceType: z.string().describe('Resource type.'),
      createdAt: z.string().describe('Creation timestamp.'),
      bytes: z.number().describe('File size in bytes.'),
      url: z.string().describe('HTTP delivery URL.'),
      secureUrl: z.string().describe('HTTPS delivery URL.'),
      tags: z.array(z.string()).optional().describe('Current tags on the asset.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let actions: string[] = [];

    // Rename first if requested
    if (ctx.input.newPublicId) {
      await client.rename(
        ctx.input.publicId,
        ctx.input.newPublicId,
        ctx.input.resourceType,
        ctx.input.overwriteOnRename
      );
      actions.push(`renamed to **${ctx.input.newPublicId}**`);
    }

    let targetPublicId = ctx.input.newPublicId || ctx.input.publicId;

    // Update other properties
    let hasUpdates =
      ctx.input.tags ||
      ctx.input.context ||
      ctx.input.metadata ||
      ctx.input.displayName ||
      ctx.input.assetFolder ||
      ctx.input.moderationStatus;

    if (hasUpdates) {
      await client.updateResource(targetPublicId, {
        resourceType: ctx.input.resourceType,
        type: ctx.input.type,
        tags: ctx.input.tags,
        context: ctx.input.context,
        metadata: ctx.input.metadata,
        displayName: ctx.input.displayName,
        assetFolder: ctx.input.assetFolder,
        moderationStatus: ctx.input.moderationStatus
      });
      if (ctx.input.tags) actions.push('updated tags');
      if (ctx.input.context) actions.push('updated context metadata');
      if (ctx.input.metadata) actions.push('updated structured metadata');
      if (ctx.input.displayName) actions.push('updated display name');
      if (ctx.input.assetFolder) actions.push('moved to folder');
      if (ctx.input.moderationStatus)
        actions.push(`set moderation to ${ctx.input.moderationStatus}`);
    }

    // Fetch updated resource
    let resource = await client.getResource(
      targetPublicId,
      ctx.input.resourceType,
      ctx.input.type
    );

    return {
      output: {
        assetId: resource.assetId,
        publicId: resource.publicId,
        format: resource.format,
        resourceType: resource.resourceType,
        createdAt: resource.createdAt,
        bytes: resource.bytes,
        url: resource.url,
        secureUrl: resource.secureUrl,
        tags: resource.tags
      },
      message: `Updated asset **${resource.publicId}**: ${actions.length > 0 ? actions.join(', ') : 'no changes applied'}.`
    };
  })
  .build();
