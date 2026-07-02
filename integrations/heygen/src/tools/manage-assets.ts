import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let listAssets = SlateTool.create(spec, {
  name: 'List Assets',
  key: 'list_assets',
  description: `List uploaded assets (images, videos, audio files) in your HeyGen account. Assets can be used as backgrounds, custom audio inputs, or visual elements in video generation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z.enum(['image', 'video', 'audio']).optional().describe('Filter by asset type')
    })
  )
  .output(
    z.object({
      assets: z
        .array(
          z.object({
            assetId: z.string().describe('Asset ID'),
            name: z.string().nullable().describe('Asset file name'),
            type: z.string().describe('Asset type (image, video, audio)'),
            url: z.string().nullable().describe('Asset URL')
          })
        )
        .describe('List of assets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.listAssets({ type: ctx.input.type });

    return {
      output: result,
      message: `Found **${result.assets.length}** asset(s)${ctx.input.type ? ` of type "${ctx.input.type}"` : ''}.`
    };
  })
  .build();

export let uploadAsset = SlateTool.create(spec, {
  name: 'Upload Asset',
  key: 'upload_asset',
  description: `Upload an asset (image, video, or audio) to HeyGen from a public URL. The uploaded asset can be used as a background, audio input, or visual element in video generation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('Public URL of the file to upload'),
      type: z
        .enum(['image', 'video', 'audio'])
        .optional()
        .describe('Type of asset being uploaded')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('ID of the uploaded asset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.uploadAsset({
      url: ctx.input.url,
      type: ctx.input.type
    });

    return {
      output: result,
      message: `Asset uploaded successfully. Asset ID: **${result.assetId}**`
    };
  })
  .build();

export let deleteAsset = SlateTool.create(spec, {
  name: 'Delete Asset',
  key: 'delete_asset',
  description: `Permanently delete an uploaded asset from your HeyGen account.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      assetId: z.string().describe('ID of the asset to delete')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('ID of the deleted asset'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    await client.deleteAsset(ctx.input.assetId);

    return {
      output: {
        assetId: ctx.input.assetId,
        deleted: true
      },
      message: `Asset **${ctx.input.assetId}** has been deleted.`
    };
  })
  .build();
