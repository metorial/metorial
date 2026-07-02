import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let projectRunCompleted = SlateTrigger.create(spec, {
  name: 'Project Run Completed',
  key: 'project_run_completed',
  description:
    'Triggers when a Hex project run finishes with a terminal status (COMPLETED, ERRORED, or KILLED).'
})
  .input(
    z.object({
      projectId: z.string(),
      runId: z.string(),
      status: z.string(),
      runUrl: z.string(),
      startTime: z.string().nullable(),
      endTime: z.string().nullable(),
      elapsedTime: z.number().nullable(),
      traceId: z.string().nullable()
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('UUID of the project that was run'),
      runId: z.string().describe('UUID of the completed run'),
      status: z.string().describe('Final run status (COMPLETED, ERRORED, or KILLED)'),
      runUrl: z.string().describe('URL to view the run in Hex'),
      startTime: z.string().nullable().describe('When the run started'),
      endTime: z.string().nullable().describe('When the run finished'),
      elapsedTime: z.number().nullable().describe('Total run duration in milliseconds'),
      traceId: z.string().nullable().describe('Trace ID for debugging')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

      let state = ctx.state as {
        seenRunIds?: Record<string, boolean>;
        projectIds?: string[];
      } | null;
      let seenRunIds: Record<string, boolean> = state?.seenRunIds ?? {};

      // Fetch all projects to monitor
      let projectsResult = await client.listProjects({ limit: 100 });
      let projects = projectsResult.values ?? [];

      let inputs: Array<{
        projectId: string;
        runId: string;
        status: string;
        runUrl: string;
        startTime: string | null;
        endTime: string | null;
        elapsedTime: number | null;
        traceId: string | null;
      }> = [];

      let terminalStatuses = ['COMPLETED', 'ERRORED', 'KILLED'];

      for (let project of projects) {
        try {
          let runsData = await client.getProjectRuns(project.projectId, { limit: 10 });
          let runs = Array.isArray(runsData) ? runsData : ((runsData as any).values ?? []);

          for (let run of runs) {
            if (terminalStatuses.includes(run.status) && !seenRunIds[run.runId]) {
              seenRunIds[run.runId] = true;
              inputs.push({
                projectId: run.projectId,
                runId: run.runId,
                status: run.status,
                runUrl: run.runUrl,
                startTime: run.startTime,
                endTime: run.endTime,
                elapsedTime: run.elapsedTime,
                traceId: run.traceId
              });
            }
          }
        } catch {
          // Skip projects that fail (e.g. no runs endpoint access)
        }
      }

      // Prune old seen run IDs to prevent unbounded growth
      let seenKeys = Object.keys(seenRunIds);
      if (seenKeys.length > 5000) {
        let toRemove = seenKeys.slice(0, seenKeys.length - 5000);
        for (let key of toRemove) {
          delete seenRunIds[key];
        }
      }

      return {
        inputs,
        updatedState: { seenRunIds }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `project_run.${ctx.input.status.toLowerCase()}`,
        id: ctx.input.runId,
        output: {
          projectId: ctx.input.projectId,
          runId: ctx.input.runId,
          status: ctx.input.status,
          runUrl: ctx.input.runUrl,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          elapsedTime: ctx.input.elapsedTime,
          traceId: ctx.input.traceId
        }
      };
    }
  })
  .build();
