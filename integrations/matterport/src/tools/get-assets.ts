import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAssets = SlateTool.create(spec, {
  name: 'Get Assets',
  key: 'get_assets',
  description: `Retrieve available asset bundles and floorplans for a Matterport model. Returns downloadable assets like floor plans, MatterPaks, point clouds, and OBJ meshes along with their availability and download URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('The unique ID of the Matterport model')
    })
  )
  .output(
    z.object({
      floorplans: z
        .array(
          z.object({
            floorLabel: z.string().nullable().optional().describe('Label for the floor'),
            floorSequence: z.number().nullable().optional().describe('Floor sequence number'),
            format: z.string().nullable().optional().describe('File format'),
            flags: z.array(z.string()).nullable().optional().describe('Floorplan flags'),
            url: z.string().nullable().optional().describe('Download URL'),
            width: z.number().nullable().optional(),
            height: z.number().nullable().optional(),
            resolution: z.number().nullable().optional()
          })
        )
        .describe('Available floor plan assets'),
      bundles: z
        .array(
          z.object({
            bundleId: z.string().describe('Bundle identifier'),
            name: z.string().nullable().optional().describe('Bundle name'),
            description: z.string().nullable().optional().describe('Bundle description'),
            availability: z.string().nullable().optional().describe('Availability status'),
            assets: z
              .array(
                z.object({
                  url: z.string().nullable().optional(),
                  format: z.string().nullable().optional()
                })
              )
              .nullable()
              .optional()
              .describe('Downloadable asset files')
          })
        )
        .describe('Available asset bundles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let [floorplans, bundlesResult] = await Promise.all([
      client.getFloorplans(ctx.input.modelId),
      client.getAssetBundles(ctx.input.modelId)
    ]);

    let mappedFloorplans = (floorplans || []).map((fp: any) => ({
      floorLabel: fp.floor?.label || null,
      floorSequence: fp.floor?.sequence || null,
      format: fp.format,
      flags: fp.flags,
      url: fp.url,
      width: fp.width,
      height: fp.height,
      resolution: fp.resolution
    }));

    let mappedBundles = (bundlesResult || []).map((b: any) => ({
      bundleId: b.id,
      name: b.name,
      description: b.description,
      availability: b.availability,
      assets: b.assets || null
    }));

    return {
      output: {
        floorplans: mappedFloorplans,
        bundles: mappedBundles
      },
      message: `Found **${mappedFloorplans.length}** floorplans and **${mappedBundles.length}** asset bundles for model **${ctx.input.modelId}**.`
    };
  })
  .build();

export let purchaseAssetBundle = SlateTool.create(spec, {
  name: 'Purchase Asset Bundle',
  key: 'purchase_asset_bundle',
  description: `Purchase an add-on asset bundle for a Matterport model, such as floor plans, MatterPaks, or point cloud files. The model must be public or unlisted before purchasing.`,
  constraints: [
    'Model must be in active state and set to public or unlisted visibility.',
    'This action may incur charges on the account.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('The unique ID of the Matterport model'),
      bundleId: z.string().describe('The bundle ID to purchase (e.g. "floorplan:schematic")'),
      deliverySpeed: z
        .enum(['normal', 'rush'])
        .optional()
        .default('normal')
        .describe('Delivery speed for the asset')
    })
  )
  .output(
    z.object({
      bundleId: z.string().describe('ID of the purchased bundle'),
      name: z.string().nullable().optional().describe('Bundle name'),
      description: z.string().nullable().optional().describe('Bundle description'),
      availability: z.string().nullable().optional().describe('Current availability status'),
      assetUrls: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('Download URLs for assets if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.purchaseBundle(
      ctx.input.modelId,
      ctx.input.bundleId,
      ctx.input.deliverySpeed
    );

    return {
      output: {
        bundleId: result.id,
        name: result.name,
        description: result.description,
        availability: result.availability,
        assetUrls: result.assets?.map((a: any) => a.url).filter(Boolean) || null
      },
      message: `Purchased bundle **${result.name || ctx.input.bundleId}** for model **${ctx.input.modelId}** (status: ${result.availability}).`
    };
  })
  .build();
