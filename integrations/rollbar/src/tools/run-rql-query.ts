import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, mapRqlResult } from '../lib/client';
import { spec } from '../spec';

export const rqlOutputSchema = z.object({
  jobId: z.number().describe('RQL job ID'),
  status: z
    .string()
    .describe('Job state: new, running, success, failed, timed_out or cancelled'),
  columns: z.array(z.string()).optional().describe('Selected column names when provided'),
  rows: z.array(z.any()).optional().describe('Result rows'),
  rowCount: z.number().optional().describe('Result row count'),
  errors: z.array(z.any()).optional().describe('Query result errors'),
  warnings: z.array(z.any()).optional().describe('Query result warnings')
});
export let runRqlQuery = SlateTool.create(spec, {
  name: 'Run RQL Query',
  key: 'run_rql_query',
  description:
    'Execute a read-only RQL query and wait briefly for completion. RQL requires the account’s Analyze entitlement. Pending, failed, timed-out and cancelled states are returned explicitly.',
  instructions: [
    'Example: SELECT item.counter, timestamp FROM item_occurrence LIMIT 10',
    'Use manage_rql_job with the returned jobId to check status, retrieve completed results or cancel a pending query.'
  ],
  constraints: [
    'Query results are retained for seven days. Large queries may remain pending after this tool returns.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      queryString: z.string().describe('RQL query string'),
      forceRefresh: z
        .boolean()
        .optional()
        .describe('Force fresh execution instead of reusing cached results'),
      waitForCompletion: z
        .boolean()
        .optional()
        .describe(
          'Wait briefly for completion, default true; false returns the initial job state'
        ),
      projectId: z
        .number()
        .optional()
        .describe('Project ID from manage_project; required with an account token.')
    })
  )
  .output(rqlOutputSchema)
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    let job = (
      await client.createRqlJob(ctx.input.queryString, {
        force_refresh: ctx.input.forceRefresh
      })
    ).result;
    for (
      let attempt = 0;
      ctx.input.waitForCompletion !== false &&
      ['new', 'running'].includes(job.status) &&
      attempt < 5;
      attempt++
    ) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      job = (await client.getRqlJob(job.id)).result;
    }
    const results =
      job.status === 'success'
        ? mapRqlResult((await client.getRqlJobResult(job.id)).result)
        : {};
    return {
      output: { jobId: job.id, status: job.status, ...results },
      message: `RQL job ${job.id}: ${job.status}${'rowCount' in results ? ` (${results.rowCount} rows)` : ''}.`
    };
  })
  .build();
