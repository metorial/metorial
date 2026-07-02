import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let frameSchema = z.object({
  frameId: z.number().describe('Frame ID'),
  name: z.string().describe('Frame name'),
  thickness: z.number().optional().describe('Frame thickness'),
  depth: z.number().optional().describe('Frame depth'),
  color: z.string().optional().describe('Frame color'),
  composite: z.string().optional().describe('Frame material composite'),
  minWidth: z.number().optional().describe('Minimum width'),
  minHeight: z.number().optional().describe('Minimum height'),
  maxWidth: z.number().optional().describe('Maximum width'),
  maxHeight: z.number().optional().describe('Maximum height'),
  priceLevel: z.number().optional().describe('Price level'),
  allowGlazing: z.boolean().optional().describe('Whether glazing is allowed'),
  allowMatting: z.boolean().optional().describe('Whether matting is allowed'),
  sampleImageUrl: z.string().optional().describe('Sample image URL'),
  profileSvgUrl: z.string().optional().describe('Profile SVG URL'),
  startingPrice: z.number().optional().describe('Starting price')
});

export let browseFraming = SlateTool.create(spec, {
  name: 'Browse Framing Options',
  key: 'browse_framing',
  description: `Browse available framing options including frame collections, mats, and glazing/glass. Use \`resourceType\` to select what to browse. Frame collections can be filtered by a product code to show only compatible frames. Provide a \`collectionId\` to see frames within a specific collection.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['collections', 'mats', 'glazing'])
        .describe('Type of framing resource to browse'),
      collectionId: z
        .number()
        .optional()
        .describe('Filter by collection ID (for collections only, shows frames within)'),
      productCode: z
        .string()
        .optional()
        .describe('Filter by product code for compatible frames (for collections only)'),
      resourceId: z.number().optional().describe('Filter by specific mat or glazing ID')
    })
  )
  .output(
    z.object({
      collections: z
        .array(
          z.object({
            collectionId: z.number().describe('Collection ID'),
            name: z.string().describe('Collection name'),
            description: z.string().optional().describe('Collection description'),
            alias: z.string().optional().describe('Collection alias'),
            iconUrl: z.string().optional().describe('Collection icon URL'),
            startingPrice: z.number().optional().describe('Starting price'),
            frames: z.array(frameSchema).optional().describe('Frames in the collection')
          })
        )
        .optional()
        .describe('Frame collections'),
      mats: z
        .array(
          z.object({
            matId: z.number().describe('Mat ID'),
            name: z.string().describe('Mat name'),
            color: z.string().optional().describe('Mat color'),
            minWidth: z.number().optional().describe('Minimum width'),
            minHeight: z.number().optional().describe('Minimum height'),
            maxWidth: z.number().optional().describe('Maximum width'),
            maxHeight: z.number().optional().describe('Maximum height'),
            composite: z.string().optional().describe('Mat material'),
            startingPrice: z.number().optional().describe('Starting price')
          })
        )
        .optional()
        .describe('Available mats'),
      glazing: z
        .array(
          z.object({
            glazingId: z.number().describe('Glazing ID'),
            name: z.string().describe('Glazing name'),
            description: z.string().optional().describe('Glazing description'),
            startingPrice: z.number().optional().describe('Starting price')
          })
        )
        .optional()
        .describe('Available glazing/glass options')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    if (ctx.input.resourceType === 'collections') {
      let data = await client.listCollections({
        collectionId: ctx.input.collectionId,
        productCode: ctx.input.productCode
      });
      if (!data.status?.success)
        throw new Error(data.status?.message || 'Failed to list collections');

      let collections = (data.collections ?? []).map((c: any) => ({
        collectionId: c.id,
        name: c.name ?? '',
        description: c.description || undefined,
        alias: c.alias || undefined,
        iconUrl: c.icon_url_1 || undefined,
        startingPrice: c.starting_price,
        frames: (c.frames ?? []).map((f: any) => ({
          frameId: f.id,
          name: f.name ?? '',
          thickness: f.thickness,
          depth: f.depth,
          color: f.color || undefined,
          composite: f.composite || undefined,
          minWidth: f.min_width,
          minHeight: f.min_height,
          maxWidth: f.max_width,
          maxHeight: f.max_height,
          priceLevel: f.price_level,
          allowGlazing: f.allow_glazing,
          allowMatting: f.allow_matting,
          sampleImageUrl: f.sample_image_url_1 || undefined,
          profileSvgUrl: f.profile_svg_url || undefined,
          startingPrice: f.starting_price
        }))
      }));

      return {
        output: { collections },
        message: `Found **${collections.length}** frame collection(s). ${collections.map((c: any) => `"${c.name}" (${c.frames?.length ?? 0} frames)`).join(', ')}`
      };
    }

    if (ctx.input.resourceType === 'mats') {
      let data = await client.listMats(ctx.input.resourceId);
      if (!data.status?.success)
        throw new Error(data.status?.message || 'Failed to list mats');

      let mats = (data.mats ?? []).map((m: any) => ({
        matId: m.id,
        name: m.name ?? '',
        color: m.color || undefined,
        minWidth: m.min_width,
        minHeight: m.min_height,
        maxWidth: m.max_width,
        maxHeight: m.max_height,
        composite: m.composite || undefined,
        startingPrice: m.starting_price
      }));

      return {
        output: { mats },
        message: `Found **${mats.length}** mat option(s). ${mats
          .slice(0, 10)
          .map((m: any) => `"${m.name}"`)
          .join(', ')}${mats.length > 10 ? '...' : ''}`
      };
    }

    // glazing
    let data = await client.listGlazing(ctx.input.resourceId);
    if (!data.status?.success)
      throw new Error(data.status?.message || 'Failed to list glazing');

    let glazing = (data.glazing ?? []).map((g: any) => ({
      glazingId: g.id,
      name: g.name ?? '',
      description: g.description || undefined,
      startingPrice: g.starting_price
    }));

    return {
      output: { glazing },
      message: `Found **${glazing.length}** glazing option(s). ${glazing.map((g: any) => `"${g.name}" ($${g.startingPrice?.toFixed(2) ?? 'N/A'})`).join(', ')}`
    };
  })
  .build();
