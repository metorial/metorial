import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjectRuns = SlateTool.create(spec, {
  name: 'List Project Runs',
  key: 'list_project_runs',
  description: `List API-triggered runs of a Hex project. Can filter by run status (PENDING, RUNNING, ERRORED, COMPLETED, KILLED). Returns run details including status, timestamps, and notifications.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('UUID of the project'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results to return (1-100)'),
      offset: z.number().optional().describe('Number of results to skip'),
      statusFilter: z
        .enum([
          'PENDING',
          'RUNNING',
          'ERRORED',
          'COMPLETED',
          'KILLED',
          'UNABLE_TO_ALLOCATE_KERNEL'
        ])
        .optional()
        .describe('Filter by run status')
    })
  )
  .output(
    z.object({
      runs: z.array(
        z.object({
          projectId: z.string(),
          runId: z.string(),
          runUrl: z.string(),
          status: z.string(),
          startTime: z.string().nullable(),
          endTime: z.string().nullable(),
          elapsedTime: z.number().nullable(),
          traceId: z.string().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let runs = await client.getProjectRuns(ctx.input.projectId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      statusFilter: ctx.input.statusFilter
    });

    let runsList = Array.isArray(runs) ? runs : ((runs as any).values ?? []);

    return {
      output: { runs: runsList },
      message: `Found **${runsList.length}** run(s) for project ${ctx.input.projectId}.`
    };
  })
  .build();
