import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runRqlQuery = SlateTool.create(spec, {
  name: 'Run RQL Query',
  key: 'run_rql_query',
  description: `Execute a Rollbar Query Language (RQL) job to run custom SQL-like queries against occurrence data. Creates a job, polls for completion, and returns the results.
RQL supports standard SQL SELECT syntax against tables like \`item_occurrence\`.`,
  instructions: [
    'Example query: SELECT * FROM item_occurrence WHERE item.counter = 123 LIMIT 10',
    'The tool will wait briefly for results. If the query is still running, you will receive the job ID to check later.'
  ],
  constraints: ['Query execution may take time for large datasets.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      queryString: z.string().describe('RQL query string (SQL-like syntax)'),
      forceRefresh: z.boolean().optional().describe('Force refresh of cached results')
    })
  )
  .output(
    z.object({
      jobId: z.number().describe('RQL job ID'),
      status: z
        .string()
        .describe('Job status (new, running, success, failed, timed_out, cancelled)'),
      columns: z.array(z.string()).optional().describe('Column names in the result'),
      rows: z.array(z.any()).optional().describe('Result rows'),
      rowCount: z.number().optional().describe('Number of rows returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let createResult = await client.createRqlJob(ctx.input.queryString, {
      force_refresh: ctx.input.forceRefresh
    });

    let jobId = createResult?.result?.id;
    let status = createResult?.result?.status;

    // Poll a few times if the job is still running
    let attempts = 0;
    while ((status === 'new' || status === 'running') && attempts < 5) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      let jobResult = await client.getRqlJob(jobId);
      status = jobResult?.result?.status;
      attempts++;
    }

    let columns: string[] | undefined;
    let rows: any[] | undefined;
    let rowCount: number | undefined;

    if (status === 'success') {
      let resultData = await client.getRqlJobResult(jobId);
      let queryResult = resultData?.result?.result;
      columns = queryResult?.columns;
      rows = queryResult?.rows;
      rowCount = rows?.length;
    }

    return {
      output: {
        jobId,
        status,
        columns,
        rows,
        rowCount
      },
      message:
        status === 'success'
          ? `RQL query completed successfully. Returned **${rowCount || 0}** rows.`
          : `RQL job **${jobId}** is in status "${status}". ${status === 'running' || status === 'new' ? 'Check back later for results.' : ''}`
    };
  })
  .build();
