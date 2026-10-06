import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { credentials, fail } from '../lib/validation';
import { spec } from '../spec';
export const downloadAsset = SlateTool.create(spec, {
  key: 'download_asset',
  name: 'Download Asset',
  description:
    'Prepare an original Cloudinary asset for download by its immutable asset ID. Supports uploaded, private and authenticated media without requesting transformations.',
  instructions: [
    'Downloads can consume bandwidth. An older connection may require reconnection for files larger than 64 MiB.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      assetId: z
        .string()
        .describe(
          'Immutable asset ID returned by get_asset, list_assets, search_assets or upload_asset.'
        )
    })
  )
  .output(
    z.object({
      assetId: z.string(),
      publicId: z.string(),
      bytes: z.number().optional(),
      format: z.string().optional(),
      resourceType: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx),
      asset = await client.getResourceByAssetId(ctx.input.assetId);
    const authorization = (ctx.auth as { authorization?: string }).authorization;
    if (authorization !== undefined) {
      if (authorization !== credentials(ctx.auth.token, ctx.auth.apiSecret))
        fail(
          'The file-delivery credential does not match this connection. Reconnect before downloading.'
        );
      await ctx.addAttachment({
        type: 'url',
        url: client.downloadUrl(asset.assetId),
        headers: { Authorization: authorization },
        query: { asset_id: asset.assetId, attachment: 'true' }
      });
    } else
      await ctx.addAttachment({
        type: 'content',
        content: await client.downloadContent(asset.assetId, asset.bytes),
        filename: asset.publicId.split('/').pop()
      });
    return {
      output: {
        assetId: asset.assetId,
        publicId: asset.publicId,
        bytes: asset.bytes,
        format: asset.format,
        resourceType: asset.resourceType
      },
      message: `Prepared asset **${asset.publicId}** for download.`
    };
  })
  .build();
