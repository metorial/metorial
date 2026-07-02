import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pollenRecordSchema = z
  .object({
    Count: z
      .object({
        grass_pollen: z.number().optional().describe('Grass pollen count'),
        tree_pollen: z.number().optional().describe('Tree pollen count'),
        weed_pollen: z.number().optional().describe('Weed pollen count')
      })
      .passthrough()
      .optional(),
    Risk: z
      .object({
        grass_pollen: z.string().optional().describe('Grass pollen risk level'),
        tree_pollen: z.string().optional().describe('Tree pollen risk level'),
        weed_pollen: z.string().optional().describe('Weed pollen risk level')
      })
      .passthrough()
      .optional(),
    Species: z
      .any()
      .optional()
      .describe('Species-level risk data (when speciesRisk is enabled)'),
    time: z.number().optional().describe('Timestamp'),
    createdAt: z.string().optional().describe('Record creation timestamp'),
    updatedAt: z.string().optional().describe('Record update timestamp')
  })
  .passthrough();

export let getPollen = SlateTool.create(spec, {
  name: 'Get Pollen',
  key: 'get_pollen',
  description: `Retrieve real-time pollen count data for tree, grass, and weed pollen. Includes risk levels for each type. Supports lookup by coordinates or place name. Optionally include species-level risk data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).optional().describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).optional().describe('Longitude (-180 to 180)'),
      place: z.string().optional().describe('Place name to query'),
      speciesRisk: z.boolean().optional().describe('Include species-level risk breakdown')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        pollenData: z.array(pollenRecordSchema).describe('Pollen data records')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      language: ctx.config.language
    });

    let result: any;

    if (ctx.input.place) {
      result = await client.getPollenByPlace(ctx.input.place, ctx.input.speciesRisk);
    } else if (ctx.input.lat !== undefined && ctx.input.lng !== undefined) {
      result = await client.getPollenByLatLng(
        ctx.input.lat,
        ctx.input.lng,
        ctx.input.speciesRisk
      );
    } else {
      throw new Error('Provide lat/lng coordinates or a place name.');
    }

    let pollenData = result.data || [];

    let summary =
      pollenData.length > 0 && pollenData[0]?.Count
        ? `Pollen levels — Tree: **${pollenData[0].Count.tree_pollen}** (${pollenData[0].Risk?.tree_pollen}), Grass: **${pollenData[0].Count.grass_pollen}** (${pollenData[0].Risk?.grass_pollen}), Weed: **${pollenData[0].Count.weed_pollen}** (${pollenData[0].Risk?.weed_pollen}).`
        : 'No pollen data available for the specified location.';

    return {
      output: {
        message: result.message,
        pollenData
      },
      message: summary
    };
  })
  .build();
