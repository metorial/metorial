import { SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { spec } from '../spec';

export let manageAsset = SlateTool.create(spec, {
  name: 'Manage Asset',
  key: 'manage_asset',
  description: `Update metadata, delete, or resync a Cincopa asset. Use "update" to change title, description, reference ID, or filename. Use "delete" to permanently remove an asset. Use "resync" to reprocess an asset that failed during initial processing.`,
  instructions: [
    'For "update" action, provide the fields you want to change.',
    'For "delete" action, the asset is permanently removed and cannot be recovered.',
    'For "resync" action, the asset will be reprocessed by Cincopa.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      assetId: z.string().describe('Asset ID (rid) to manage'),
      action: z.enum(['update', 'delete', 'resync']).describe('Action to perform'),
      title: z.string().optional().describe('New title (for update action)'),
      description: z.string().optional().describe('New description (for update action)'),
      referenceId: z.string().optional().describe('New reference ID (for update action)'),
      fileName: z.string().optional().describe('New filename (for update action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CincopaClient({ token: ctx.auth.token });
    let { action, assetId } = ctx.input;

    if (action === 'update') {
      let data = await client.setAssetMetadata({
        rid: assetId,
        title: ctx.input.title,
        description: ctx.input.description,
        referenceId: ctx.input.referenceId,
        fileName: ctx.input.fileName
      });
      return {
        output: { success: data.success === true },
        message: `Asset \`${assetId}\` metadata updated.`
      };
    }

    if (action === 'delete') {
      let data = await client.deleteAsset(assetId);
      return {
        output: { success: data.success === true },
        message: `Asset \`${assetId}\` permanently deleted.`
      };
    }

    if (action === 'resync') {
      let data = await client.resyncAsset(assetId);
      return {
        output: { success: data.success === true },
        message: `Asset \`${assetId}\` queued for reprocessing.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
