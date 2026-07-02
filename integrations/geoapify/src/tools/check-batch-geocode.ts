import { SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

export let checkBatchGeocode = SlateTool.create(spec, {
  name: 'Check Batch Geocode Results',
  key: 'check_batch_geocode',
  description: `Check the status and retrieve results of a previously submitted batch geocoding job. Provide the job ID returned by the **Batch Geocode** tool.`,
  constraints: ['Results are available for 24 hours after job completion.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Job ID from a previous batch geocode submission')
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

    let response = await client.batchGeocodeResults(ctx.input.jobId);

    if (response.status === 200 && Array.isArray(response.data)) {
      return {
        output: {
          pending: false,
          results: response.data
        },
        message: `Batch geocoding completed. **${response.data.length}** result(s) returned.`
      };
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
