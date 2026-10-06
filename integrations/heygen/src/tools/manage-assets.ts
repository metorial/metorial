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
      type: z
        .enum(['image', 'video', 'audio'])
        .optional()
        .describe(
          'Filter the returned page by asset type; an empty page may still have a next cursor'
        ),
      paginationToken: z.string().optional().describe('Cursor from a previous page'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum assets per provider page')
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
        .describe('List of assets'),
      paginationToken: z.string().nullable(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient(ctx.auth);

    let result = await client.listAssets({ ...ctx.input, token: ctx.input.paginationToken });

    return {
      output: { ...result, paginationToken: result.token },
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
      url: z.url().describe('Public HTTPS URL of the file to upload; maximum 32 MB'),
      type: z
        .enum(['image', 'video', 'audio'])
        .optional()
        .describe('Expected asset type; the provider detects the uploaded file type')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('ID of the uploaded asset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient(ctx.auth);

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
    let client = new HeyGenClient(ctx.auth);

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
