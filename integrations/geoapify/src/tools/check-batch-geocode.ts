import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

export let checkBatchGeocode = SlateTool.create(spec, {
  name: 'Check Batch Geocode Results',
  key: 'check_batch_geocode',
  description: `Check the status and retrieve results of a previously submitted forward or reverse batch geocoding job. Provide the job ID returned by batch_geocode or batch_reverse_geocode and the matching direction. Completed results include a downloadable JSON file.`,
  constraints: ['Results are available for 24 hours after job completion.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().min(1).describe('Job ID from a previous batch geocode submission'),
      direction: z
        .enum(['forward', 'reverse'])
        .optional()
        .describe('Job direction. Defaults to forward; use reverse for batch_reverse_geocode.')
    })
  )
  .output(
    z.object({
      pending: z.boolean().describe('Whether the batch is still being processed'),
      results: z.array(z.any()).optional().describe('Geocoding results (if ready)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });

    let reverse = ctx.input.direction === 'reverse';
    let response = reverse
      ? await client.batchReverseGeocodeResults(ctx.input.jobId)
      : await client.batchGeocodeResults(ctx.input.jobId);

    if (response.status === 200 && Array.isArray(response.data)) {
      await ctx.addAttachment({
        type: 'url',
        url: `https://api.geoapify.com/v1/batch/geocode/${reverse ? 'reverse' : 'search'}`,
        query: { id: ctx.input.jobId, format: 'json', apiKey: ctx.auth.token },
        mimeType: 'application/json',
        filename: 'geocoding-results.json'
      });
      return {
        output: {
          pending: false,
          results: response.data
        },
        message: `Batch geocoding completed. **${response.data.length}** result(s) returned.`
      };
    }

    if (response.status !== 202 && response.data?.status !== 'pending') {
      throw createApiServiceError('Geoapify returned an unexpected batch geocoding result.');
    }

    return {
      output: {
        pending: true,
        results: undefined
      },
      message: `Batch geocoding job is still processing. Try again shortly.`
    };
  })
  .build();
