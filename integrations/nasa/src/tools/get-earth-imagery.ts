import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

export let getEarthImagery = SlateTool.create(spec, {
  name: 'Get Earth Satellite Imagery',
  key: 'get_earth_imagery',
  description: `Retrieve Landsat satellite imagery and asset information for a specific location on Earth. Provide latitude and longitude to get satellite images for those coordinates, optionally filtered by date. Also supports checking available imagery assets for a location.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().describe('Latitude of the location (-90 to 90)'),
      lon: z.number().describe('Longitude of the location (-180 to 180)'),
      date: z
        .string()
        .optional()
        .describe('Date (YYYY-MM-DD) for the imagery. Defaults to most recent available.'),
      dim: z
        .number()
        .optional()
        .describe('Width and height of the image in degrees. Default is 0.025.'),
      assetsOnly: z
        .boolean()
        .optional()
        .describe(
          'Set to true to return only asset metadata (date, resource URL) without the actual image.'
        )
    })
  )
  .output(
    z.object({
      imageUrl: z.string().optional().describe('URL to the satellite image'),
      date: z.string().optional().describe('Date of the imagery'),
      resourceUrl: z
        .string()
        .optional()
        .describe('URL to the imagery resource/scene on cloud storage')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });

    if (ctx.input.assetsOnly) {
      let assets = await client.getEarthAssets({
        lat: ctx.input.lat,
        lon: ctx.input.lon,
        date: ctx.input.date || '2020-01-01',
        dim: ctx.input.dim
      });
      return {
        output: {
          date: assets.date,
          resourceUrl: assets.url
        },
        message: `Found Earth imagery asset for (${ctx.input.lat}, ${ctx.input.lon}) dated **${assets.date}**.`
      };
    }

    let imagery = await client.getEarthImagery({
      lat: ctx.input.lat,
      lon: ctx.input.lon,
      date: ctx.input.date,
      dim: ctx.input.dim
    });

    return {
      output: {
        imageUrl: imagery.url,
        date: imagery.date,
        resourceUrl: imagery.resource?.dataset
      },
      message: `Retrieved satellite imagery for coordinates (${ctx.input.lat}, ${ctx.input.lon})${imagery.date ? ` dated **${imagery.date}**` : ''}.`
    };
  })
  .build();
