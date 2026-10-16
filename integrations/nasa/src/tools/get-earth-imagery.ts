import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient, validateDate } from '../lib/client';
import { spec } from '../spec';

export let getEarthImagery = SlateTool.create(spec, {
  name: 'Get Earth Satellite Imagery',
  key: 'get_earth_imagery',
  description: `Retrieve Landsat satellite imagery and asset information for a specific location on Earth. Provide latitude and longitude to get satellite images for those coordinates, optionally filtered by date. Also supports checking available imagery assets for a location.`,
  constraints: [
    'NASA marks the legacy Earth API archived and recommends Earthdata GIBS; historical endpoint availability is not guaranteed.'
  ],
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
      raw: z.any().optional().describe('Complete provider response'),
      imageUrl: z.string().optional().describe('URL to the satellite image'),
      date: z.string().optional().describe('Date of the imagery'),
      resourceUrl: z
        .string()
        .optional()
        .describe('URL to the imagery resource/scene on cloud storage')
    })
  )
  .handleInvocation(async ctx => {
    validateDate(ctx.input.date, 'Date');
    if (
      !Number.isFinite(ctx.input.lat) ||
      ctx.input.lat < -90 ||
      ctx.input.lat > 90 ||
      !Number.isFinite(ctx.input.lon) ||
      ctx.input.lon < -180 ||
      ctx.input.lon > 180
    ) {
      throw createApiServiceError(
        'Latitude must be between -90 and 90 and longitude between -180 and 180.'
      );
    }
    if (
      ctx.input.dim !== undefined &&
      (!Number.isFinite(ctx.input.dim) || ctx.input.dim <= 0)
    ) {
      throw createApiServiceError('Image dimension must be positive.');
    }
    let client = new NasaClient({ token: ctx.auth.token });

    let requestedDate = ctx.input.date ?? new Date().toISOString().slice(0, 10);
    let assets = await client.getEarthAssets({
      lat: ctx.input.lat,
      lon: ctx.input.lon,
      date: requestedDate,
      dim: ctx.input.dim
    });
    let imageUrl = typeof assets.url === 'string' ? assets.url : undefined;
    if (!ctx.input.assetsOnly) {
      if (!imageUrl) {
        throw createApiServiceError(
          'NASA did not return a downloadable Earth image. The legacy Earth API is archived; use NASA Earthdata GIBS for current imagery.'
        );
      }
      await ctx.addAttachment({
        type: 'url',
        url: 'https://api.nasa.gov/planetary/earth/imagery',
        mimeType: 'image/png',
        query: {
          api_key: ctx.auth.token,
          lat: String(ctx.input.lat),
          lon: String(ctx.input.lon),
          date: requestedDate,
          ...(ctx.input.dim !== undefined ? { dim: String(ctx.input.dim) } : {})
        }
      });
    }

    return {
      output: {
        raw: assets,
        imageUrl: ctx.input.assetsOnly ? undefined : imageUrl,
        date: assets.date,
        resourceUrl: imageUrl
      },
      message: `Retrieved Earth imagery ${ctx.input.assetsOnly ? 'metadata' : 'image'} for (${ctx.input.lat}, ${ctx.input.lon})${assets.date ? ` dated **${assets.date}**` : ''}.`
    };
  })
  .build();
