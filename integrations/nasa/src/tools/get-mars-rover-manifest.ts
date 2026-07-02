import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

export let getMarsRoverManifest = SlateTool.create(spec, {
  name: 'Get Mars Rover Manifest',
  key: 'get_mars_rover_manifest',
  description: `Retrieve the mission manifest for a NASA Mars rover. Returns mission status, launch/landing dates, total photos taken, and a breakdown of photos available per sol. Useful for discovering which sols and cameras have available photos before querying.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      rover: z.enum(['curiosity', 'opportunity', 'spirit']).describe('Name of the Mars rover')
    })
  )
  .output(
    z.object({
      roverName: z.string().describe('Name of the rover'),
      landingDate: z.string().describe('Earth date the rover landed on Mars'),
      launchDate: z.string().describe('Earth date the rover was launched'),
      status: z.string().describe('Current mission status (active or complete)'),
      maxSol: z.number().describe('Maximum sol value with available photos'),
      maxDate: z.string().describe('Most recent Earth date with available photos'),
      totalPhotos: z.number().describe('Total number of photos taken by this rover'),
      photoManifest: z
        .array(
          z.object({
            sol: z.number().describe('Martian sol'),
            earthDate: z.string().describe('Corresponding Earth date'),
            totalPhotos: z.number().describe('Number of photos taken on this sol'),
            cameras: z.array(z.string()).describe('Cameras that took photos on this sol')
          })
        )
        .describe('Per-sol photo availability breakdown')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });

    let result = await client.getMarsRoverManifest(ctx.input.rover);
    let manifest = result.photo_manifest;

    let photoManifest = (manifest.photos || []).map((p: any) => ({
      sol: p.sol,
      earthDate: p.earth_date,
      totalPhotos: p.total_photos,
      cameras: p.cameras || []
    }));

    return {
      output: {
        roverName: manifest.name,
        landingDate: manifest.landing_date,
        launchDate: manifest.launch_date,
        status: manifest.status,
        maxSol: manifest.max_sol,
        maxDate: manifest.max_date,
        totalPhotos: manifest.total_photos,
        photoManifest
      },
      message: `**${manifest.name}** rover: status **${manifest.status}**, ${manifest.total_photos} total photos across ${manifest.max_sol} sols.`
    };
  })
  .build();
