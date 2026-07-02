import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pollenHistorySchema = z
  .object({
    Count: z
      .object({
        grass_pollen: z.number().optional(),
        tree_pollen: z.number().optional(),
        weed_pollen: z.number().optional()
      })
      .passthrough()
      .optional(),
    Risk: z
      .object({
        grass_pollen: z.string().optional(),
        tree_pollen: z.string().optional(),
        weed_pollen: z.string().optional()
      })
      .passthrough()
      .optional(),
    time: z.number().optional().describe('Record timestamp'),
    createdAt: z.string().optional()
  })
  .passthrough();

export let getPollenHistory = SlateTool.create(spec, {
  name: 'Get Pollen History',
  key: 'get_pollen_history',
  description: `Retrieve historical pollen count data for tree, grass, and weed pollen over a specified time window. Query by coordinates or place name.`,
  constraints: [
    'Maximum query window is 48 hours.',
    'Timestamps must be in format "YYYY-MM-DD HH:mm:ss".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).optional().describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).optional().describe('Longitude (-180 to 180)'),
      place: z.string().optional().describe('Place name to query'),
      from: z.string().describe('Start timestamp in "YYYY-MM-DD HH:mm:ss" format'),
      to: z.string().describe('End timestamp in "YYYY-MM-DD HH:mm:ss" format'),
      speciesRisk: z.boolean().optional().describe('Include species-level risk breakdown')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        records: z.array(pollenHistorySchema).describe('Historical pollen records')
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
      result = await client.getPollenHistoryByPlace(
        ctx.input.place,
        ctx.input.from,
        ctx.input.to,
        ctx.input.speciesRisk
      );
    } else if (ctx.input.lat !== undefined && ctx.input.lng !== undefined) {
      result = await client.getPollenHistoryByLatLng(
        ctx.input.lat,
        ctx.input.lng,
        ctx.input.from,
        ctx.input.to,
        ctx.input.speciesRisk
      );
    } else {
      throw new Error('Provide lat/lng coordinates or a place name.');
    }

    let records = result.data || [];

    return {
      output: {
        message: result.message,
        records
      },
      message: `Retrieved **${records.length}** historical pollen records from ${ctx.input.from} to ${ctx.input.to}.`
    };
  })
  .build();
