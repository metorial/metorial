import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { deleteSchema } from '../lib/types';
import { fail } from '../lib/validation';
import { spec } from '../spec';

export let deleteAssets = SlateTool.create(spec, {
  name: 'Delete Assets',
  key: 'delete_assets',
  description: `Delete one or more assets from Cloudinary. Supports deleting by specific public IDs, by a shared prefix, or by a tag. Backups and cached CDN copies may remain.`,
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
      nextCursor: z
        .string()
        .optional()
        .describe('Continuation from partial prefix or tag deletion; keep the same selector.'),
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
  .output(deleteSchema)
  .handleInvocation(async ctx => {
    const count = [ctx.input.publicIds, ctx.input.prefix, ctx.input.tag].filter(
      value => value !== undefined
    ).length;
    if (count !== 1) fail('Provide exactly one of publicIds, prefix or tag.');
    if (ctx.input.nextCursor !== undefined && ctx.input.publicIds !== undefined)
      fail('nextCursor is supported only for prefix or tag deletions.');
    if (ctx.input.tag !== undefined && ctx.input.type !== 'upload')
      fail(
        'Tag deletion applies to uploaded assets; use exact publicIds for another delivery type.'
      );
    const client = createClient(ctx);
    const result =
      ctx.input.publicIds !== undefined
        ? await client.deleteResources({ ...ctx.input, publicIds: ctx.input.publicIds })
        : ctx.input.prefix !== undefined
          ? await client.deleteResourcesByPrefix({ ...ctx.input, prefix: ctx.input.prefix })
          : await client.deleteResourcesByTag({ ...ctx.input, tag: ctx.input.tag! });
    const countDeleted = Object.values(result.deleted).filter(
      status => status === 'deleted'
    ).length;
    return {
      output: result,
      message: `Cloudinary confirmed ${countDeleted} deleted asset(s). Other receipt statuses are preserved.${result.partial || result.nextCursor ? ' Deletion is partial; continue with nextCursor and the same selector.' : ''} Backups, CDN copies, prior usage and configured notifications may remain.`
    };
  })
  .build();
