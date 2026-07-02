import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGear = SlateTool.create(spec, {
  name: 'Get Gear',
  key: 'get_gear',
  description: `Retrieve details about a piece of gear (shoes, bike, etc.) by its identifier. Gear IDs can be found in activity details or the athlete profile.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      gearId: z
        .string()
        .describe('The gear identifier (e.g., "b12345" for bikes, "g12345" for shoes)')
    })
  )
  .output(
    z.object({
      gearId: z.string().describe('Gear identifier'),
      name: z.string().describe('Gear name'),
      brandName: z.string().nullable().optional().describe('Brand name'),
      modelName: z.string().nullable().optional().describe('Model name'),
      distance: z.number().describe('Total distance tracked in meters'),
      primary: z.boolean().optional().describe('Whether this is the primary gear'),
      description: z.string().nullable().optional().describe('Gear description'),
      frameType: z.number().nullable().optional().describe('Frame type (for bikes)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let gear = await client.getGear(ctx.input.gearId);

    return {
      output: {
        gearId: gear.id,
        name: gear.name,
        brandName: gear.brand_name,
        modelName: gear.model_name,
        distance: gear.distance,
        primary: gear.primary,
        description: gear.description,
        frameType: gear.frame_type
      },
      message: `Retrieved gear **${gear.name}** (${gear.brand_name || 'Unknown brand'}) — ${(gear.distance / 1000).toFixed(0)} km tracked.`
    };
  })
  .build();
