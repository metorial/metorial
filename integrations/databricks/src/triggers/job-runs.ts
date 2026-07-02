import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let jobRunsTrigger = SlateTrigger.create(spec, {
  name: 'Job Run Events',
  key: 'job_run_events',
  description:
    '[Polling fallback] Polls for completed, failed, or timed-out job runs. Fires when a job run reaches a terminal state.'
})
  .input(
    z.object({
      runId: z.string().describe('Run ID'),
      jobId: z.string().describe('Job ID'),
      state: z.string().describe('Lifecycle state'),
      resultState: z.string().optional().describe('Result state'),
      startTime: z.string().optional().describe('Run start time in epoch ms'),
      endTime: z.string().optional().describe('Run end time in epoch ms'),
      runName: z.string().optional().describe('Run name'),
      executionDurationMs: z.number().optional().describe('Execution duration in ms')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('Unique run identifier'),
      jobId: z.string().describe('Job ID'),
      jobName: z.string().optional().describe('Job name'),
      state: z.string().describe('Final lifecycle state'),
      resultState: z
        .string()
        .optional()
        .describe('Result: SUCCESS, FAILED, TIMEDOUT, CANCELED'),
      startTime: z.string().optional().describe('Run start time in epoch ms'),
      endTime: z.string().optional().describe('Run end time in epoch ms'),
      runName: z.string().optional().describe('Run name'),
      executionDurationMs: z.number().optional().describe('Execution duration in ms'),
      triggerType: z.string().optional().describe('What triggered the run')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DatabricksClient({
        workspaceUrl: ctx.config.workspaceUrl,
        token: ctx.auth.token
      });

      let lastPollTime = (ctx.state as any)?.lastPollTime ?? 0;
      let now = Date.now();

      let result = await client.listJobRuns({
        completedOnly: true,
        limit: 25
      });

      let runs = (result.runs ?? []).filter((r: any) => {
        let endTime = r.end_time ?? 0;
        return endTime > lastPollTime;
      });

      let inputs = runs.map((r: any) => ({
        runId: String(r.run_id),
        jobId: String(r.job_id),
        state: r.state?.life_cycle_state ?? 'UNKNOWN',
        resultState: r.state?.result_state,
        startTime: r.start_time ? String(r.start_time) : undefined,
        endTime: r.end_time ? String(r.end_time) : undefined,
        runName: r.run_name,
        executionDurationMs: r.execution_duration
      }));

      return {
        inputs,
        updatedState: {
          lastPollTime: now
        }
      };
    },

    handleEvent: async ctx => {
      let resultType = ctx.input.resultState?.toLowerCase() ?? 'completed';

      return {
        type: `job_run.${resultType}`,
        id: ctx.input.runId,
        output: {
          runId: ctx.input.runId,
          jobId: ctx.input.jobId,
          state: ctx.input.state,
          resultState: ctx.input.resultState,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          runName: ctx.input.runName,
          executionDurationMs: ctx.input.executionDurationMs
        }
      };
    }
  })
  .build();
