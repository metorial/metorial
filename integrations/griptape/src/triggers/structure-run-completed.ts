import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let structureRunCompleted = SlateTrigger.create(spec, {
  name: 'Structure Run Completed',
  key: 'structure_run_completed',
  description:
    'Triggers when a structure run reaches a terminal state (succeeded, failed, error, or cancelled).'
})
  .input(
    z.object({
      structureRunId: z.string().describe('ID of the completed run'),
      structureId: z.string().describe('ID of the structure'),
      status: z.string().describe('Terminal status of the run'),
      output: z.any().optional().describe('Output of the run'),
      createdAt: z.string().describe('When the run was created'),
      completedAt: z.string().optional().describe('When the run completed')
    })
  )
  .output(
    z.object({
      structureRunId: z.string().describe('ID of the completed run'),
      structureId: z.string().describe('ID of the structure'),
      status: z.string().describe('Terminal status of the run'),
      output: z.any().optional().describe('Output of the run'),
      createdAt: z.string().describe('When the run was created'),
      completedAt: z.string().optional().describe('When the run completed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

      let knownCompletedIds: string[] = ctx.state?.knownCompletedIds ?? [];
      let structureIds: string[] = ctx.state?.structureIds ?? [];

      // On first run, fetch all structures to monitor
      if (structureIds.length === 0) {
        let structuresResult = await client.listStructures({ pageSize: 100 });
        structureIds = structuresResult.items.map((s: any) => s.structure_id);
      }

      let inputs: Array<{
        structureRunId: string;
        structureId: string;
        status: string;
        output?: any;
        createdAt: string;
        completedAt?: string;
      }> = [];

      let newCompletedIds: string[] = [...knownCompletedIds];

      for (let structureId of structureIds) {
        try {
          let runsResult = await client.listStructureRuns(structureId, {
            pageSize: 20,
            status: ['SUCCEEDED', 'FAILED', 'ERROR', 'CANCELLED']
          });

          for (let run of runsResult.items) {
            if (!knownCompletedIds.includes(run.structure_run_id)) {
              inputs.push({
                structureRunId: run.structure_run_id,
                structureId: run.structure_id,
                status: run.status,
                output: run.output,
                createdAt: run.created_at,
                completedAt: run.completed_at
              });
              newCompletedIds.push(run.structure_run_id);
            }
          }
        } catch {
          // Skip structures that may have been deleted
        }
      }

      // Keep only the last 500 IDs to prevent state from growing indefinitely
      if (newCompletedIds.length > 500) {
        newCompletedIds = newCompletedIds.slice(-500);
      }

      return {
        inputs,
        updatedState: {
          knownCompletedIds: newCompletedIds,
          structureIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `structure_run.${ctx.input.status.toLowerCase()}`,
        id: ctx.input.structureRunId,
        output: {
          structureRunId: ctx.input.structureRunId,
          structureId: ctx.input.structureId,
          status: ctx.input.status,
          output: ctx.input.output,
          createdAt: ctx.input.createdAt,
          completedAt: ctx.input.completedAt
        }
      };
    }
  })
  .build();
