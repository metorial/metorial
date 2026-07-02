import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let flowRunTrigger = SlateTrigger.create(spec, {
  name: 'Flow Run Completed',
  key: 'flow_run_completed',
  description:
    'Triggers when a flow run completes. Polls the project analytics to detect new runs and provides run details including status, latency, token usage, and outputs.'
})
  .input(
    z.object({
      runId: z.string().describe('Unique ID of the flow run'),
      flowId: z.string().describe('The flow that was executed'),
      runDate: z.string().describe('When the run occurred'),
      success: z.boolean().describe('Whether the run succeeded'),
      state: z.string().optional().describe('Current state of the run'),
      error: z.string().optional().describe('Error message if the run failed'),
      latencyMs: z.number().optional().describe('Run latency in milliseconds'),
      totalTokens: z.number().optional().describe('Total tokens used'),
      userId: z.string().optional().describe('User who triggered the run'),
      inputs: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Inputs provided to the flow'),
      outputs: z.record(z.string(), z.unknown()).optional().describe('Outputs from the flow')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('Unique ID of the flow run'),
      flowId: z.string().describe('The flow that was executed'),
      runDate: z.string().describe('When the run occurred'),
      success: z.boolean().describe('Whether the run succeeded'),
      state: z.string().optional().describe('Current state of the run'),
      error: z.string().optional().describe('Error message if the run failed'),
      latencyMs: z.number().optional().describe('Run latency in milliseconds'),
      totalTokens: z.number().optional().describe('Total tokens used'),
      userId: z.string().optional().describe('User who triggered the run'),
      inputs: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Inputs provided to the flow'),
      outputs: z.record(z.string(), z.unknown()).optional().describe('Outputs from the flow')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let state = ctx.input.state as { lastPollTime?: string; seenRunIds?: string[] } | null;
      let lastPollTime = state?.lastPollTime;
      let seenRunIds = state?.seenRunIds || [];

      let client = new Client({
        token: ctx.auth.token,
        orgId: ctx.config.orgId
      });

      // Get org-wide analytics to find all projects, then check for new runs
      let projectSummaries = await client.getOrganizationAnalytics({
        page: 0,
        pageSize: 50
      });

      let allInputs: Array<{
        runId: string;
        flowId: string;
        runDate: string;
        success: boolean;
        state?: string;
        error?: string;
        latencyMs?: number;
        totalTokens?: number;
        userId?: string;
        inputs?: Record<string, unknown>;
        outputs?: Record<string, unknown>;
      }> = [];

      // For each project with recent runs, get the detailed run logs
      for (let project of projectSummaries) {
        let projectId = project.project_id as string | undefined;
        if (!projectId) continue;

        let runs = await client.getProjectAnalytics(projectId, {
          page: 0,
          pageSize: 25,
          startDate: lastPollTime
        });

        for (let run of runs) {
          let runId = run.run_id as string;
          if (!runId || seenRunIds.includes(runId)) continue;

          allInputs.push({
            runId,
            flowId: projectId,
            runDate: (run.date as string) || new Date().toISOString(),
            success: (run.flow_success as boolean) ?? true,
            state: run.state as string | undefined,
            error: run.error as string | undefined,
            latencyMs: run.latency as number | undefined,
            totalTokens: run.total_tokens as number | undefined,
            userId: run.user_id as string | undefined,
            inputs: run.inputs as Record<string, unknown> | undefined,
            outputs: run.outputs as Record<string, unknown> | undefined
          });
        }
      }

      let newSeenIds = [...allInputs.map(i => i.runId), ...seenRunIds].slice(0, 500); // Keep last 500 IDs for dedup

      return {
        inputs: allInputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          seenRunIds: newSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.success ? 'flow_run.completed' : 'flow_run.failed',
        id: ctx.input.runId,
        output: {
          runId: ctx.input.runId,
          flowId: ctx.input.flowId,
          runDate: ctx.input.runDate,
          success: ctx.input.success,
          state: ctx.input.state,
          error: ctx.input.error,
          latencyMs: ctx.input.latencyMs,
          totalTokens: ctx.input.totalTokens,
          userId: ctx.input.userId,
          inputs: ctx.input.inputs,
          outputs: ctx.input.outputs
        }
      };
    }
  })
  .build();
