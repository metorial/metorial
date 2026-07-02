import { SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

export let batchGeocode = SlateTool.create(spec, {
  name: 'Batch Geocode',
  key: 'batch_geocode',
  description: `Submit a batch of up to 1000 addresses for geocoding in a single request. The API processes them asynchronously. This tool submits the batch and attempts to retrieve results. If results aren't ready yet, it returns a job ID you can use to check back later with the **Check Batch Geocode Results** tool.`,
  constraints: [
    'Maximum 1000 addresses per batch.',
    'Results are available for 24 hours after completion.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      addresses: z
        .array(z.string())
        .min(1)
        .max(1000)
        .describe('Array of address strings to geocode'),
      type: z
        .enum(['country', 'state', 'city', 'postcode', 'street', 'amenity'])
        .optional()
        .describe('Filter results by location type'),
      lang: z.string().optional().describe('ISO 639-1 language code for results'),
      limit: z.number().optional().describe('Maximum results per address'),
      filter: z.string().optional().describe('Geographic filter constraint'),
      bias: z.string().optional().describe('Geographic proximity bias')
    })
  )
  .output(
    z.object({
      jobId: z
        .string()
        .optional()
        .describe('Job ID for retrieving results later (if still processing)'),
      pending: z.boolean().describe('Whether the batch is still being processed'),
      results: z.array(z.any()).optional().describe('Geocoding results (if ready)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });

    let submitResponse = await client.batchGeocodeSubmit({
      addresses: ctx.input.addresses,
      type: ctx.input.type,
      lang: ctx.input.lang,
      limit: ctx.input.limit,
      filter: ctx.input.filter,
      bias: ctx.input.bias
    });

    let jobId = submitResponse.id || submitResponse;

    // Try to get results (may return 202 if still processing)
    if (typeof jobId === 'string') {
      let resultResponse = await client.batchGeocodeResults(jobId);
      if (resultResponse.status === 200 && Array.isArray(resultResponse.data)) {
        return {
          output: {
            jobId,
            pending: false,
            results: resultResponse.data
          },
          message: `Batch geocoding completed. **${resultResponse.data.length}** result(s) returned.`
        };
      }
    }

    return {
      output: {
        jobId: typeof jobId === 'string' ? jobId : undefined,
        pending: true,
        results: undefined
      },
      message: `Batch geocoding submitted for **${ctx.input.addresses.length}** address(es). Job is still processing — use the **Check Batch Geocode Results** tool with the job ID to retrieve results.`
    };
  })
  .build();
