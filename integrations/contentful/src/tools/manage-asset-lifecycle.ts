import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageAssetLifecycle = SlateTool.create(spec, {
  name: 'Manage Asset Lifecycle',
  key: 'manage_asset_lifecycle',
  description: `Perform lifecycle actions on an asset: publish, unpublish, archive, unarchive, or delete. Fetches the current version automatically if not provided.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      assetId: z.string().describe('ID of the asset.'),
      action: z
        .enum(['publish', 'unpublish', 'archive', 'unarchive', 'delete'])
        .describe('Lifecycle action to perform.'),
      version: z
        .number()
        .optional()
        .describe('Current version of the asset. Fetched automatically if omitted.')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('ID of the asset.'),
      action: z.string().describe('The action that was performed.'),
      version: z.number().optional().describe('Version after the action, if applicable.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { assetId, action } = ctx.input;

    let version = ctx.input.version;
    if (!version) {
      let current = await client.getAsset(assetId);
      version = current.sys.version;
    }

    let result: any;
    switch (action) {
      case 'publish':
        result = await client.publishAsset(assetId, version!);
        break;
      case 'unpublish':
        result = await client.unpublishAsset(assetId, version!);
        break;
      case 'archive':
        result = await client.archiveAsset(assetId, version!);
        break;
      case 'unarchive':
        result = await client.unarchiveAsset(assetId, version!);
        break;
      case 'delete':
        await client.deleteAsset(assetId, version!);
        break;
    }

    return {
      output: {
        assetId,
        action,
        version: result?.sys?.version
      },
      message:
        action === 'delete'
          ? `Deleted asset **${assetId}**.`
          : `Asset **${assetId}** has been **${action}ed** (version ${result?.sys?.version}).`
    };
  })
  .build();
