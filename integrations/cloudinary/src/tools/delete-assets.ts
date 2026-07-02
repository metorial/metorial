import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let deleteAssets = SlateTool.create(spec, {
  name: 'Delete Assets',
  key: 'delete_assets',
  description: `Delete one or more assets from Cloudinary. Supports deleting by specific public IDs, by a shared prefix, or by a tag. Deleted assets are permanently removed from cloud storage.`,
  instructions: [
    'Provide exactly one of: publicIds, prefix, or tag to specify which assets to delete.',
    'Deleting by prefix or tag can affect many assets - use with caution.'
  ],
  constraints: [
    'Up to 100 public IDs can be deleted in a single request.',
    'Up to 1000 assets when deleting by prefix or tag.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      publicIds: z
        .array(z.string())
        .optional()
        .describe('List of public IDs to delete (up to 100).'),
      prefix: z
        .string()
        .optional()
        .describe('Delete all assets whose public ID starts with this prefix.'),
      tag: z.string().optional().describe('Delete all assets with this tag.'),
      resourceType: z
        .enum(['image', 'video', 'raw'])
        .default('image')
        .describe('Resource type of assets to delete.'),
      type: z
        .enum(['upload', 'fetch', 'private', 'authenticated'])
        .default('upload')
        .describe('Delivery type of assets to delete. Not used when deleting by tag.')
    })
  )
  .output(
    z.object({
      deleted: z
        .record(z.string(), z.string())
        .describe('Map of public IDs to their deletion status.'),
      partial: z
        .boolean()
        .describe('Whether only a partial set was deleted (more remain to be deleted).')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result: { deleted: Record<string, string>; partial: boolean };

    if (ctx.input.publicIds && ctx.input.publicIds.length > 0) {
      result = await client.deleteResources({
        publicIds: ctx.input.publicIds,
        resourceType: ctx.input.resourceType,
        type: ctx.input.type
      });
    } else if (ctx.input.prefix) {
      result = await client.deleteResourcesByPrefix({
        prefix: ctx.input.prefix,
        resourceType: ctx.input.resourceType,
        type: ctx.input.type
      });
    } else if (ctx.input.tag) {
      result = await client.deleteResourcesByTag({
        tag: ctx.input.tag,
        resourceType: ctx.input.resourceType
      });
    } else {
      throw new Error('Provide at least one of: publicIds, prefix, or tag.');
    }

    let deletedCount = Object.keys(result.deleted).length;

    return {
      output: result,
      message: `Deleted **${deletedCount}** asset(s).${result.partial ? ' More assets remain to be deleted.' : ''}`
    };
  })
  .build();
