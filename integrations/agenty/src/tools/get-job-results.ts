import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJobResults = SlateTool.create(spec, {
  name: 'Get Job Results',
  key: 'get_job_results',
  description: `Retrieve the scraped data results from a completed or in-progress job. Results are returned in paginated JSON format, max 2500 rows per request. Use offset and limit for pagination through large result sets.`,
  instructions: [
    'Maximum 2500 rows per request. For larger datasets, use offset and limit to paginate.',
    'Set modified=1 to get only new or changed rows since the last fetch.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique identifier of the job.'),
      offset: z.number().optional().describe('Number of rows to skip. Defaults to 0.'),
      limit: z.number().optional().describe('Maximum rows to return. Max 2500.'),
      collection: z
        .number()
        .optional()
        .describe('Collection index to retrieve results from. Defaults to 1.'),
      modified: z.number().optional().describe('Set to 1 to only get new/changed rows.')
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
