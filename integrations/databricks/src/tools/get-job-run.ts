import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let getJobRun = SlateTool.create(spec, {
  name: 'Get Job Run',
  key: 'get_job_run',
  description: `Retrieve details and status of a specific job run, including task states, timing, and output. Can also list recent runs for a given job.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      runId: z.string().optional().describe('Run ID to get details for'),
      jobId: z
        .string()
        .optional()
        .describe('Job ID to list recent runs for (used if runId is not provided)'),
      activeOnly: z.boolean().optional().describe('Only list active runs'),
      completedOnly: z.boolean().optional().describe('Only list completed runs'),
      limit: z.number().optional().describe('Maximum number of runs to return when listing')
    })
  )
  .output(
    z.object({
      run: z
        .object({
          runId: z.string().describe('Unique run identifier'),
          jobId: z.string().describe('Job ID'),
          runName: z.string().optional().describe('Name of the run'),
          state: z
            .string()
            .optional()
            .describe('Current lifecycle state (e.g., RUNNING, TERMINATED)'),
          resultState: z.string().optional().describe('Result state (e.g., SUCCESS, FAILED)'),
          startTime: z.string().optional().describe('Start time in epoch ms'),
          endTime: z.string().optional().describe('End time in epoch ms'),
          executionDurationMs: z
            .number()
            .optional()
            .describe('Execution duration in milliseconds'),
          tasks: z
            .array(
              z.object({
                taskKey: z.string().describe('Task key'),
                state: z.string().optional().describe('Task lifecycle state'),
                resultState: z.string().optional().describe('Task result state')
              })
            )
            .optional()
            .describe('Task-level states')
        })
        .optional()
        .describe('Single run details (when runId is provided)'),
      runs: z
        .array(
          z.object({
            runId: z.string().describe('Run ID'),
            jobId: z.string().describe('Job ID'),
            state: z.string().optional().describe('Lifecycle state'),
            resultState: z.string().optional().describe('Result state'),
            startTime: z.string().optional().describe('Start time')
          })
        )
        .optional()
        .describe('List of runs (when listing by jobId)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    if (ctx.input.runId) {
      let run = await client.getJobRun(ctx.input.runId);
      let mapped = {
        runId: String(run.run_id),
        jobId: String(run.job_id),
        runName: run.run_name,
        state: run.state?.life_cycle_state,
        resultState: run.state?.result_state,
        startTime: run.start_time ? String(run.start_time) : undefined,
        endTime: run.end_time ? String(run.end_time) : undefined,
        executionDurationMs: run.execution_duration,
        tasks: (run.tasks ?? []).map((t: any) => ({
          taskKey: t.task_key,
          state: t.state?.life_cycle_state,
          resultState: t.state?.result_state
        }))
      };

      return {
        output: { run: mapped },
        message: `Run **${mapped.runId}**: ${mapped.state ?? 'UNKNOWN'}${mapped.resultState ? ` — ${mapped.resultState}` : ''}.`
      };
    }

    let result = await client.listJobRuns({
      jobId: ctx.input.jobId,
      activeOnly: ctx.input.activeOnly,
      completedOnly: ctx.input.completedOnly,
      limit: ctx.input.limit
    });

    let runs = (result.runs ?? []).map((r: any) => ({
      runId: String(r.run_id),
      jobId: String(r.job_id),
      state: r.state?.life_cycle_state,
      resultState: r.state?.result_state,
      startTime: r.start_time ? String(r.start_time) : undefined
    }));

    return {
      output: { runs },
      message: `Found **${runs.length}** run(s).`
    };
  })
  .build();
