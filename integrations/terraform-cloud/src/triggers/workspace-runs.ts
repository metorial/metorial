import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapRun } from '../lib/mappers';
import { spec } from '../spec';

export let workspaceRunsTrigger = SlateTrigger.create(spec, {
  name: 'New Workspace Runs',
  key: 'workspace_runs',
  description:
    '[Polling fallback] Polls for new Terraform runs in a specified workspace. Triggers whenever a new run is created, including plan, apply, and destroy runs.'
})
  .input(
    z.object({
      runId: z.string().describe('The run ID'),
      status: z.string().describe('Current run status'),
      message: z.string().describe('Run message'),
      source: z.string().describe('Where the run was triggered from'),
      isDestroy: z.boolean().describe('Whether this is a destroy run'),
      createdAt: z.string().describe('When the run was created'),
      hasChanges: z.boolean().describe('Whether the run has changes'),
      autoApply: z.boolean().describe('Whether auto-apply is enabled'),
      planOnly: z.boolean().describe('Whether this is a plan-only run'),
      workspaceId: z.string().describe('The workspace ID'),
      planId: z.string().describe('The plan ID'),
      applyId: z.string().describe('The apply ID')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('The Terraform run ID'),
      status: z.string().describe('Current status of the run'),
      message: z.string().describe('Message describing the run'),
      source: z
        .string()
        .describe('Source of the run (tfe-ui, tfe-api, tfe-configuration-version, etc.)'),
      isDestroy: z.boolean().describe('Whether this is a destroy run'),
      createdAt: z.string().describe('When the run was created'),
      hasChanges: z.boolean().describe('Whether the plan detected changes'),
      autoApply: z.boolean().describe('Whether auto-apply is enabled for this run'),
      planOnly: z.boolean().describe('Whether this is a speculative plan-only run'),
      workspaceId: z.string().describe('The workspace ID'),
      planId: z.string().describe('Associated plan ID'),
      applyId: z.string().describe('Associated apply ID')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let state = ctx.state as { lastSeenRunId?: string; workspaceId?: string } | null;

      // We need a workspace to poll — use the first one available if not set
      let workspaceId = state?.workspaceId;

      if (!workspaceId) {
        // Get the first workspace in the org to start polling
        let workspaces = await client.listWorkspaces({ pageSize: 1 });
        if (!workspaces.data || workspaces.data.length === 0) {
          return { inputs: [], updatedState: state || {} };
        }
        workspaceId = workspaces.data[0].id;
      }

      let response = await client.listRuns(workspaceId!, { pageSize: 10 });
      let runs = (response.data || []).map(mapRun);

      if (runs.length === 0) {
        return {
          inputs: [],
          updatedState: { lastSeenRunId: state?.lastSeenRunId, workspaceId }
        };
      }

      let lastSeenRunId = state?.lastSeenRunId;
      let newRuns: any[] = [];

      if (!lastSeenRunId) {
        // First poll — only report the most recent run
        newRuns = runs.slice(0, 1);
      } else {
        // Collect all runs newer than the last seen
        for (let run of runs) {
          if (run.runId === lastSeenRunId) break;
          newRuns.push(run);
        }
      }

      let inputs = newRuns.map((run: ReturnType<typeof mapRun>) => ({
        runId: run.runId,
        status: run.status,
        message: run.message,
        source: run.source,
        isDestroy: run.isDestroy,
        createdAt: run.createdAt,
        hasChanges: run.hasChanges,
        autoApply: run.autoApply,
        planOnly: run.planOnly,
        workspaceId: run.workspaceId,
        planId: run.planId,
        applyId: run.applyId
      }));

      return {
        inputs,
        updatedState: {
          lastSeenRunId: runs[0]?.runId || lastSeenRunId,
          workspaceId
        }
      };
    },

    handleEvent: async ctx => {
      let runType = ctx.input.isDestroy
        ? 'destroy'
        : ctx.input.planOnly
          ? 'plan_only'
          : 'standard';

      return {
        type: `run.${runType}`,
        id: ctx.input.runId,
        output: {
          runId: ctx.input.runId,
          status: ctx.input.status,
          message: ctx.input.message,
          source: ctx.input.source,
          isDestroy: ctx.input.isDestroy,
          createdAt: ctx.input.createdAt,
          hasChanges: ctx.input.hasChanges,
          autoApply: ctx.input.autoApply,
          planOnly: ctx.input.planOnly,
          workspaceId: ctx.input.workspaceId,
          planId: ctx.input.planId,
          applyId: ctx.input.applyId
        }
      };
    }
  })
  .build();
