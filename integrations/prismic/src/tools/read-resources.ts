import { SlateTool } from 'slates';
import { z } from 'zod';
import { AssetApiClient, TypesApiClient } from '../lib/client';
import { inconsistent, invalid, protect } from '../lib/contracts';
import { spec } from '../spec';

export const getSharedSlice = SlateTool.create(spec, {
  name: 'Get Shared Slice',
  key: 'get_shared_slice',
  description:
    'Read one exact shared-slice model. Use List Shared Slices to discover its ID. Requires a Write API token.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      sliceId: z.string().describe('Exact shared-slice ID from List Shared Slices.')
    })
  )
  .output(
    z.object({
      sliceId: z.string(),
      type: z.string(),
      name: z.string(),
      description: z.string().optional(),
      variations: z.array(
        z.object({
          variationId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          docURL: z.string().optional(),
          version: z.string().optional(),
          primary: z.record(z.string(), z.unknown()).optional(),
          items: z.record(z.string(), z.unknown()).optional(),
          imageUrl: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const protectedTokens = [
      ctx.auth.token,
      ctx.auth.writeToken,
      ctx.auth.migrationToken
    ].filter((value): value is string => !!value);
    protect(ctx.input, protectedTokens);
    if (!ctx.auth.writeToken) invalid('A Write API token is required to read shared slices.');
    const slice = await new TypesApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken,
      protectedTokens
    }).getSharedSlice(ctx.input.sliceId);
    return {
      output: {
        sliceId: slice.id,
        type: slice.type,
        name: slice.name,
        description: slice.description,
        variations: slice.variations.map(variation => ({
          variationId: variation.id,
          name: variation.name,
          description: variation.description,
          docURL: variation.docURL,
          version: variation.version,
          primary: variation.primary,
          items: variation.items,
          imageUrl: variation.imageUrl
        }))
      },
      message: 'Retrieved the shared-slice model.'
    };
  })
  .build();

export const downloadAsset = SlateTool.create(spec, {
  name: 'Download Asset',
  key: 'download_asset',
  description:
    'Prepare the exact media-library asset for download using its provider URL. Call List Assets to discover its ID. Requires a Write API token.',
  tags: { readOnly: true }
})
  .input(z.object({ assetId: z.string().describe('Exact asset ID from List Assets.') }))
  .output(
    z.object({ assetId: z.string(), filename: z.string(), size: z.number(), kind: z.string() })
  )
  .handleInvocation(async ctx => {
    const protectedTokens = [
      ctx.auth.token,
      ctx.auth.writeToken,
      ctx.auth.migrationToken
    ].filter((value): value is string => !!value);
    protect(ctx.input, protectedTokens);
    if (!ctx.auth.writeToken)
      invalid('A Write API token is required to read media-library assets.');
    const asset = await new AssetApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken,
      protectedTokens
    }).getAsset(ctx.input.assetId);
    let url: URL;
    try {
      url = new URL(asset.url);
    } catch {
      return inconsistent();
    }
    const hosts = ['images.prismic.io', 'prismic-io.s3.amazonaws.com', 'prismic-io.imgix.net'];
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !hosts.includes(url.hostname)
    )
      inconsistent();
    await ctx.addAttachment({ type: 'url', url: url.toString(), filename: asset.filename });
    return {
      output: {
        assetId: asset.id,
        filename: asset.filename,
        size: asset.size,
        kind: asset.kind
      },
      message: 'Prepared the requested asset for download.'
    };
  })
  .build();
