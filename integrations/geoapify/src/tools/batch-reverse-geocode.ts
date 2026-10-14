import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

export let batchReverseGeocode = SlateTool.create(spec, {
  name: 'Batch Reverse Geocode',
  key: 'batch_reverse_geocode',
  description:
    'Submit up to 1000 coordinates for asynchronous reverse geocoding. Retrieve pending results with check_batch_geocode using direction "reverse". Completed results are provided as a downloadable JSON file.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      coordinates: z
        .array(
          z.object({
            lat: z.number().min(-90).max(90).describe('Latitude in decimal degrees'),
            lon: z.number().min(-180).max(180).describe('Longitude in decimal degrees')
          })
        )
        .min(1)
        .max(1000)
        .describe('Coordinates to convert to addresses'),
      type: z
        .enum([
          'country',
          'state',
          'city',
          'postcode',
          'street',
          'amenity',
          'locality',
          'building'
        ])
        .optional()
        .describe('Address level to return'),
      lang: z.string().optional().describe('ISO 639-1 language code')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Job ID to pass to check_batch_geocode'),
      pending: z.boolean().describe('Whether the job is still processing'),
      resultCount: z.number().optional().describe('Number of completed results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });
    let data = await client.batchReverseGeocodeSubmit({
      coordinates: ctx.input.coordinates.map(point => [point.lon, point.lat]),
      type: ctx.input.type,
      lang: ctx.input.lang
    });

    if (Array.isArray(data)) {
      await ctx.addAttachment({
        type: 'content',
        content: new Response(JSON.stringify(data), {
          headers: { 'content-type': 'application/json' }
        }),
        filename: 'reverse-geocoding-results.json'
      });
      return {
        output: { pending: false, resultCount: data.length },
        message: `Reverse geocoding completed with **${data.length}** result(s). The JSON file is ready to download.`
      };
    }

    let jobId = typeof data === 'string' ? data : data?.id;
    if (typeof jobId !== 'string' || !jobId.trim()) {
      throw createApiServiceError(
        'Geoapify did not return a reverse geocoding job ID or results.'
      );
    }
    return {
      output: { jobId, pending: true },
      message: `Submitted **${ctx.input.coordinates.length}** coordinate(s). Use check_batch_geocode with this job ID and direction "reverse" to retrieve results.`
    };
  })
  .build();
