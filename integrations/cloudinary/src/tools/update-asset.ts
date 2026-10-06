import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { resourceSchema } from '../lib/types';
import { fail } from '../lib/validation';
import { spec } from '../spec';

export let updateAsset = SlateTool.create(spec, {
  name: 'Update Asset',
  key: 'update_asset',
  description: `Update properties of an existing Cloudinary asset. Can modify tags, contextual metadata, structured metadata, display name, asset folder, and moderation status. Can also rename the asset's public ID.`,
  instructions: [
    'If a rename succeeds but a later update fails, read the immutable assetId before retrying.',
    'To rename an asset, provide both publicId and newPublicId.',
    'To update metadata or tags without renaming, omit newPublicId.'
  ],
  tags: {
    destructive: true,
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
        .describe(
          'Set image moderation to approved or rejected. The legacy pending value is a read state and is rejected before any update or rename.'
        )
    })
  )
  .output(resourceSchema)
  .handleInvocation(async ctx => {
    const client = createClient(ctx),
      input = ctx.input;
    const hasUpdates = [
      'tags',
      'context',
      'metadata',
      'displayName',
      'assetFolder',
      'moderationStatus'
    ].some(key => input[key as keyof typeof input] !== undefined);
    if (!hasUpdates && input.newPublicId === undefined)
      fail('Supply a newPublicId or an asset property to update.');
    if (input.overwriteOnRename !== undefined && input.newPublicId === undefined)
      fail('overwriteOnRename requires newPublicId.');
    client.validateUpdate(input);
    const before = await client.getResource(input.publicId, input.resourceType, input.type);
    if (input.newPublicId !== undefined) {
      const renamed = await client.rename(
        input.publicId,
        input.newPublicId,
        input.resourceType,
        input.overwriteOnRename,
        input.type
      );
      if (renamed.assetId !== before.assetId)
        fail(
          'The rename receipt belongs to another asset. Read the original immutable asset ID before retrying.',
          'cloudinary_unconfirmed_mutation'
        );
    }
    const target = input.newPublicId ?? input.publicId;
    if (hasUpdates) {
      const receipt = await client.updateResource(target, input);
      if (receipt.assetId !== before.assetId)
        fail(
          'The update receipt belongs to another asset. Read the original immutable asset ID before retrying.',
          'cloudinary_unconfirmed_mutation'
        );
    }
    const resource = await client.getResourceByAssetId(before.assetId);
    if (
      resource.publicId !== target ||
      (resource.type !== undefined && resource.type !== input.type)
    )
      fail(
        'Cloudinary did not confirm the requested asset locator. Read current state before retrying.',
        'cloudinary_unconfirmed_mutation'
      );
    for (const field of ['displayName', 'assetFolder'] as const)
      if (input[field] !== undefined && resource[field] !== input[field])
        fail(
          'Cloudinary did not confirm the requested asset properties. Read current state before retrying.',
          'cloudinary_unconfirmed_mutation'
        );
    if (
      input.tags !== undefined &&
      (resource.tags === undefined ||
        JSON.stringify([...resource.tags].sort()) !== JSON.stringify([...input.tags].sort()))
    )
      fail(
        'Cloudinary did not confirm the requested tags. Read current state before retrying.',
        'cloudinary_unconfirmed_mutation'
      );
    if (
      input.context !== undefined &&
      Object.entries(input.context).some(([key, value]) => resource.context?.[key] !== value)
    )
      fail(
        'Cloudinary did not confirm the requested context. Read current state before retrying.',
        'cloudinary_unconfirmed_mutation'
      );
    if (
      input.metadata !== undefined &&
      Object.entries(input.metadata).some(([key, value]) => {
        let expected: unknown = value;
        try {
          expected = JSON.parse(value);
        } catch {}
        return (
          JSON.stringify(resource.metadata?.[key]) !== JSON.stringify(expected) &&
          resource.metadata?.[key] !== value
        );
      })
    )
      fail(
        'Cloudinary did not confirm the requested structured metadata. Read current state before retrying.',
        'cloudinary_unconfirmed_mutation'
      );
    if (
      input.moderationStatus !== undefined &&
      !resource.moderation?.some(item => item.status === input.moderationStatus)
    )
      fail(
        'Cloudinary did not confirm the requested moderation status. Read current state before retrying.',
        'cloudinary_unconfirmed_mutation'
      );
    return {
      output: resource,
      message: `Updated asset **${resource.publicId}** and confirmed its immutable ID and requested state. Renames and overwrites can retain backups, cached copies and configured notification effects.`
    };
  })
  .build();
