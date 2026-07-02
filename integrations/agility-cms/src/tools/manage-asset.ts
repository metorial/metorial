import { SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let manageAsset = SlateTool.create(spec, {
  name: 'Manage Asset',
  key: 'manage_asset',
  description: `Deletes or moves a media asset in the Agility CMS asset library. Use "delete" to permanently remove an asset or "move" to relocate it to a different folder. Requires OAuth authentication.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      operation: z
        .enum(['delete', 'move'])
        .describe('Operation: "delete" to remove the asset, "move" to relocate it'),
      mediaId: z.number().describe('The media ID of the asset'),
      destinationFolder: z
        .string()
        .optional()
        .describe('Target folder path for move operations')
    })
  )
  .output(
    z.object({
      mediaId: z.number().describe('The media ID of the affected asset'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.config.locale,
      region: ctx.auth.region
    });

    if (ctx.input.operation === 'delete') {
      await client.deleteAsset(ctx.input.mediaId);
      return {
        output: { mediaId: ctx.input.mediaId, success: true },
        message: `Deleted asset **#${ctx.input.mediaId}**`
      };
    }

    if (!ctx.input.destinationFolder) {
      throw new Error('destinationFolder is required for move operations');
    }
    await client.moveAsset(ctx.input.mediaId, ctx.input.destinationFolder);
    return {
      output: { mediaId: ctx.input.mediaId, success: true },
      message: `Moved asset **#${ctx.input.mediaId}** to **${ctx.input.destinationFolder}**`
    };
  })
  .build();
