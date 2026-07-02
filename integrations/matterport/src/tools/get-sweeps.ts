import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sweepLocationSchema = z.object({
  locationId: z.string().describe('Unique sweep location identifier'),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number()
    })
    .nullable()
    .optional()
    .describe('3D position of the sweep'),
  floorId: z.string().nullable().optional().describe('ID of the floor this sweep is on'),
  roomId: z.string().nullable().optional().describe('ID of the room this sweep is in'),
  panoramas: z
    .array(
      z.object({
        panoramaId: z.string().describe('Panoramic image ID'),
        skybox: z
          .object({
            skyboxId: z.string().nullable().optional(),
            status: z.string().nullable().optional().describe('Processing status'),
            format: z.string().nullable().optional().describe('Image format'),
            faceUrls: z
              .array(z.string())
              .nullable()
              .optional()
              .describe('URLs for the six cube-face images')
          })
          .nullable()
          .optional()
      })
    )
    .describe('Panoramic images at this location')
});

export let getSweeps = SlateTool.create(spec, {
  name: 'Get Panoramic Sweeps',
  key: 'get_sweeps',
  description: `Retrieve all panoramic sweep locations and their imagery for a Matterport model. Each sweep includes position data and skybox cube-face image URLs at the specified resolution.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('The unique ID of the Matterport model'),
      resolution: z
        .enum(['512', '1k', '2k', '4k'])
        .optional()
        .default('2k')
        .describe('Resolution for panoramic images')
    })
  )
  .output(
    z.object({
      locations: z
        .array(sweepLocationSchema)
        .describe('List of sweep locations with panoramic data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let locations = await client.getSweeps(ctx.input.modelId, ctx.input.resolution);

    let mappedLocations = (locations || []).map((loc: any) => ({
      locationId: loc.id,
      position: loc.position || null,
      floorId: loc.floor?.id || null,
      roomId: loc.room?.id || null,
      panoramas: (loc.panos || []).map((p: any) => ({
        panoramaId: p.id,
        skybox: p.skybox
          ? {
              skyboxId: p.skybox.id || null,
              status: p.skybox.status || null,
              format: p.skybox.format || null,
              faceUrls: p.skybox.children || null
            }
          : null
      }))
    }));

    return {
      output: { locations: mappedLocations },
      message: `Found **${mappedLocations.length}** panoramic sweep locations for model **${ctx.input.modelId}** at ${ctx.input.resolution} resolution.`
    };
  })
  .build();
