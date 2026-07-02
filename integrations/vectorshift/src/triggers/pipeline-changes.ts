import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createApiClient, fetchPipeline, listPipelines } from '../lib/client';
import { spec } from '../spec';

export let pipelineChangesTrigger = SlateTrigger.create(spec, {
  name: 'Pipeline Changes',
  key: 'pipeline_changes',
  description: 'Detects when pipelines are added or removed from the account.'
})
  .input(
    z.object({
      changeType: z
        .enum(['added', 'removed'])
        .describe('Whether the pipeline was added or removed'),
      pipelineId: z.string().describe('ID of the affected pipeline')
    })
  )
  .output(
    z.object({
      pipelineId: z.string().describe('ID of the affected pipeline'),
      name: z
        .string()
        .optional()
        .describe('Name of the pipeline (available for added pipelines)'),
      description: z.string().optional().describe('Description of the pipeline')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let api = createApiClient(ctx.auth.token);
      let result = await listPipelines(api, { includeShared: false, verbose: false });
      let currentIds: string[] = result.object_ids ?? [];
      let previousIds: string[] = (ctx.state?.knownIds as string[]) ?? [];

      let addedIds = currentIds.filter(id => !previousIds.includes(id));
      let removedIds = previousIds.filter(id => !currentIds.includes(id));

      let inputs = [
        ...addedIds.map(id => ({ changeType: 'added' as const, pipelineId: id })),
        ...removedIds.map(id => ({ changeType: 'removed' as const, pipelineId: id }))
      ];

      return {
        inputs,
        updatedState: {
          knownIds: currentIds
        }
      };
    },

    handleEvent: async ctx => {
      let name: string | undefined;
      let description: string | undefined;

      if (ctx.input.changeType === 'added') {
        try {
          let api = createApiClient(ctx.auth.token);
          let result = await fetchPipeline(api, { pipelineId: ctx.input.pipelineId });
          let obj = result.object ?? result;
          name = obj.name;
          description = obj.description;
        } catch {
          // Pipeline details may not be available
        }
      }

      return {
        type: `pipeline.${ctx.input.changeType}`,
        id: `pipeline.${ctx.input.changeType}.${ctx.input.pipelineId}`,
        output: {
          pipelineId: ctx.input.pipelineId,
          name,
          description
        }
      };
    }
  })
  .build();
