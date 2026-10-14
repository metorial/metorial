import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

export let checkIsoline = SlateTool.create(spec, {
  name: 'Check Isoline',
  key: 'check_isoline',
  description:
    'Retrieve an isoline by the ID returned by calculate_isoline. Reports processing status and provides completed reachability polygons as a downloadable GeoJSON file.',
  constraints: ['Previously generated isolines can be retrieved within 24 hours.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      isolineId: z.string().min(1).describe('Isoline ID returned by calculate_isoline')
    })
  )
  .output(
    z.object({
      isolineId: z.string().describe('Requested isoline ID'),
      pending: z.boolean().describe('Whether calculation is still processing'),
      polygonCount: z.number().describe('Number of completed polygons'),
      ranges: z.array(z.number()).describe('Range values for the completed polygons')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });
    let response = await client.getIsoline(ctx.input.isolineId);
    let pending = response.status === 202;
    if (!pending && (response.status !== 200 || !Array.isArray(response.data?.features))) {
      throw createApiServiceError('Geoapify returned an unexpected isoline result.');
    }
    let features: any[] = response.data?.features ?? [];
    if (!Array.isArray(features)) {
      throw createApiServiceError('Geoapify returned invalid isoline features.');
    }
    if (!pending) {
      await ctx.addAttachment({
        type: 'url',
        url: 'https://api.geoapify.com/v1/isoline',
        query: { id: ctx.input.isolineId, apiKey: ctx.auth.token },
        mimeType: 'application/geo+json',
        filename: 'isoline.geojson'
      });
    }
    return {
      output: {
        isolineId: ctx.input.isolineId,
        pending,
        polygonCount: features.length,
        ranges: features
          .map(feature => feature.properties?.range)
          .filter((range): range is number => typeof range === 'number')
      },
      message: pending
        ? 'Isoline calculation is still processing. Try again shortly.'
        : `Retrieved **${features.length}** isoline polygon(s). The GeoJSON file is ready to download.`
    };
  })
  .build();
