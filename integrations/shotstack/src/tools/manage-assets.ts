import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServeClient } from '../lib/client';
import { spec } from '../spec';

let assetSchema = z.object({
  assetId: z.string().describe('Asset ID'),
  owner: z.string().optional().describe('Account owner ID'),
  region: z.string().optional().describe('Asset region'),
  renderId: z.string().optional().describe('Associated render ID'),
  filename: z.string().optional().describe('Asset filename'),
  url: z.string().optional().describe('CDN URL of the asset'),
  status: z.string().optional().describe('Asset status (e.g. ready, queued, failed)'),
  created: z.string().optional().describe('Creation timestamp'),
  updated: z.string().optional().describe('Last update timestamp')
});

let mapAsset = (item: any) => ({
  assetId: item.attributes?.id || item.id,
  owner: item.attributes?.owner,
  region: item.attributes?.region,
  renderId: item.attributes?.renderId,
  filename: item.attributes?.filename,
  url: item.attributes?.url,
  status: item.attributes?.status,
  created: item.attributes?.created,
  updated: item.attributes?.updated
});

export let getAssetTool = SlateTool.create(spec, {
  name: 'Get Hosted Asset',
  key: 'get_hosted_asset',
  description: `Retrieve details of a hosted asset by its asset ID. Returns the CDN URL, status, and metadata. Assets are stored on Shotstack's CDN by default.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      assetId: z.string().describe('The hosted asset ID')
    })
  )
  .output(assetSchema)
  .handleInvocation(async ctx => {
    let client = new ServeClient(ctx.auth.token, ctx.config.environment);
    let result = await client.getAsset(ctx.input.assetId);

    let asset = mapAsset(result.data);

    return {
      output: asset,
      message: `Asset **${asset.assetId}** is **${asset.status}**${asset.url ? `. URL: ${asset.url}` : '.'}`
    };
  })
  .build();

export let getAssetsByRenderIdTool = SlateTool.create(spec, {
  name: 'Get Assets by Render',
  key: 'get_assets_by_render',
  description: `Look up all hosted assets for a render job (video, poster, thumbnail). Up to 3 assets may be returned per render.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      renderId: z.string().describe('The render job ID')
    })
  )
  .output(
    z.object({
      assets: z.array(assetSchema).describe('List of hosted assets for the render')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServeClient(ctx.auth.token, ctx.config.environment);
    let result = await client.getAssetsByRenderId(ctx.input.renderId);

    let assets = (result.data || []).map(mapAsset);

    return {
      output: { assets },
      message: `Found **${assets.length}** asset(s) for render **${ctx.input.renderId}**.`
    };
  })
  .build();

export let deleteAssetTool = SlateTool.create(spec, {
  name: 'Delete Hosted Asset',
  key: 'delete_hosted_asset',
  description: `Permanently delete a hosted asset from the Shotstack CDN.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      assetId: z.string().describe('The hosted asset ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServeClient(ctx.auth.token, ctx.config.environment);
    await client.deleteAsset(ctx.input.assetId);

    return {
      output: { success: true },
      message: `Hosted asset **${ctx.input.assetId}** deleted.`
    };
  })
  .build();

export let transferAssetTool = SlateTool.create(spec, {
  name: 'Transfer Asset',
  key: 'transfer_asset',
  description: `Fetch a file from a public URL and distribute it to one or more hosting destinations. Supports Shotstack CDN, AWS S3, Mux, Google Cloud Storage, Google Drive, and Vimeo.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('Public URL of the file to transfer'),
      transferId: z.string().optional().describe('Custom ID for the transfer (UUID format)'),
      destinations: z
        .array(
          z.object({
            provider: z
              .enum([
                'shotstack',
                's3',
                'mux',
                'google-cloud-storage',
                'google-drive',
                'vimeo'
              ])
              .describe('Destination provider'),
            exclude: z.boolean().optional().describe('Exclude this destination'),
            options: z
              .record(z.string(), z.any())
              .optional()
              .describe('Provider-specific options (e.g. bucket, region for S3)')
          })
        )
        .optional()
        .describe('Output destinations. Defaults to Shotstack CDN.')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('ID of the queued transfer'),
      status: z.string().describe('Transfer status'),
      created: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServeClient(ctx.auth.token, ctx.config.environment);

    let body: Record<string, any> = { url: ctx.input.url };
    if (ctx.input.transferId) body.id = ctx.input.transferId;
    if (ctx.input.destinations) body.destinations = ctx.input.destinations;

    let result = await client.transferAsset(body);

    let attrs = result.data?.attributes || {};

    return {
      output: {
        assetId: attrs.id || result.data?.id,
        status: attrs.status || 'queued',
        created: attrs.created
      },
      message: `Transfer queued with asset ID **${attrs.id || result.data?.id}**.`
    };
  })
  .build();
