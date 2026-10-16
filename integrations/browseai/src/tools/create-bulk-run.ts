import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapBulkRun, numeric, rawSchema } from '../lib/response';
import { spec } from '../spec';

export let createBulkRun = SlateTool.create(spec, {
  name: 'Create Bulk Run',
  key: 'create_bulk_run',
  description: `Submit a bulk run to process many pages in a single operation. Provide a list of input parameter sets (typically URLs) and a descriptive title. This is the recommended approach for large-scale data extraction instead of creating individual tasks.`,
  constraints: [
    'Maximum 1,000 input parameter sets per API call.',
    'The v2 API supports bulk runs of up to 50,000 tasks; submit separate bulk runs for larger datasets.'
  ]
})
  .input(
    z.object({
      robotId: z
        .string()
        .describe('ID of the robot to run in bulk. Call list_robots to discover robot IDs.'),
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
      title: z
        .string()
        .optional()
        .describe('Title of the bulk run when supplied by Browse AI'),
      status: z.string().describe('Current status of the bulk run'),
      totalTaskCount: z.number().describe('Total number of tasks in this bulk run'),
      createdAt: z
        .number()
        .optional()
        .describe('Unix timestamp when the bulk run was created'),
      raw: rawSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let bulkRun = await new Client(ctx.auth).createBulkRun(
      ctx.input.robotId,
      ctx.input.title,
      ctx.input.inputParametersList
    );
    let output = {
      ...mapBulkRun(bulkRun),
      totalTaskCount: numeric(
        bulkRun.tasksCount ?? bulkRun.totalTaskCount,
        'bulk run task count'
      )
    };
    return {
      output,
      message: `Created bulk run \`${output.bulkRunId}\` with **${output.totalTaskCount}** task(s).`
    };
  })
  .build();
