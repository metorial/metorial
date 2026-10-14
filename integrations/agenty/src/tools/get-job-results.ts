import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJobResults = SlateTool.create(spec, {
  name: 'Get Job Results',
  key: 'get_job_results',
  description: `Retrieve the scraped data results from a completed or in-progress job. Results are returned in paginated JSON format, max 1000 rows per request. Use offset and limit for pagination through large result sets.`,
  instructions: [
    'Maximum 1000 rows per request. For larger datasets, use offset and limit to paginate.',
    'Set modified=1 to use post-processed results when available, or modified=0 for the original results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique identifier of the job.'),
      offset: z
        .number()
        .min(0)
        .refine(Number.isInteger, 'Use a whole-number offset.')
        .optional()
        .describe('Number of rows to skip. Defaults to 0.'),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .refine(Number.isInteger, 'Use a whole-number limit.')
        .optional()
        .describe('Maximum rows to return. Max 1000.'),
      collection: z
        .number()
        .optional()
        .describe('Collection index to retrieve results from. Defaults to 1.'),
      modified: z
        .number()
        .min(0)
        .max(1)
        .refine(Number.isInteger, 'Use 0 or 1.')
        .optional()
        .describe(
          'Use 1 for post-processed results when available, or 0 for original results.'
        )
    })
  )
  .output(
    z.object({
      rows: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Array of scraped data rows. Each row is an object with field names as keys.'
        ),
      total: z.number().optional().nullable().describe('Total number of result rows.'),
      returned: z.number().describe('Number of rows returned in this response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getJobResult(ctx.input.jobId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      collection: ctx.input.collection,
      modified: ctx.input.modified
    });

    let rows = Array.isArray(result) ? result : result.result || result.data || [];
    let total = result.total;

    return {
      output: {
        rows,
        total,
        returned: rows.length
      },
      message: `Retrieved **${rows.length}** result rows from job **${ctx.input.jobId}**.${total != null ? ` Total available: ${total}.` : ''}`
    };
  })
  .build();
