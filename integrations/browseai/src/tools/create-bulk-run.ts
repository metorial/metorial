import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBulkRun = SlateTool.create(spec, {
  name: 'Create Bulk Run',
  key: 'create_bulk_run',
  description: `Submit a bulk run to process many pages in a single operation. Provide a list of input parameter sets (typically URLs) and a descriptive title. This is the recommended approach for large-scale data extraction instead of creating individual tasks.`,
  constraints: [
    'Maximum 1,000 input parameter sets per API call.',
    'Maximum 500,000 tasks per bulk run (submit multiple calls if needed).'
  ]
})
  .input(
    z.object({
      robotId: z.string().describe('ID of the robot to run in bulk'),
      title: z.string().describe('Descriptive title for this bulk run'),
      inputParametersList: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Array of input parameter objects, each typically containing an "originUrl" key'
        )
    })
  )
  .output(
    z.object({
      bulkRunId: z.string().describe('ID of the created bulk run'),
      title: z.string().describe('Title of the bulk run'),
      status: z.string().describe('Current status of the bulk run'),
      totalTaskCount: z.number().describe('Total number of tasks in this bulk run'),
      createdAt: z.number().optional().describe('Unix timestamp when the bulk run was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createBulkRun(
      ctx.input.robotId,
      ctx.input.title,
      ctx.input.inputParametersList
    );

    let bulkRun = result.bulkRun ?? result;

    return {
      output: {
        bulkRunId: bulkRun.id,
        title: bulkRun.title,
        status: bulkRun.status,
        totalTaskCount: bulkRun.totalTaskCount ?? ctx.input.inputParametersList.length,
        createdAt: bulkRun.createdAt
      },
      message: `Bulk run \`${bulkRun.id}\` created with **${bulkRun.totalTaskCount ?? ctx.input.inputParametersList.length}** task(s).`
    };
  })
  .build();
