import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createApiClient, fetchTransformation, listTransformations } from '../lib/client';
import { spec } from '../spec';

export let transformationChangesTrigger = SlateTrigger.create(spec, {
  name: 'Transformation Changes',
  key: 'transformation_changes',
  description: 'Detects when transformations are added or removed from the account.'
})
  .input(
    z.object({
      changeType: z
        .enum(['added', 'removed'])
        .describe('Whether the transformation was added or removed'),
      transformationId: z.string().describe('ID of the affected transformation')
    })
  )
  .output(
    z.object({
      transformationId: z.string().describe('ID of the affected transformation'),
      name: z
        .string()
        .optional()
        .describe('Name of the transformation (available for added transformations)'),
      description: z.string().optional().describe('Description of the transformation')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let api = createApiClient(ctx.auth.token);
      let result = await listTransformations(api, { includeShared: false, verbose: false });
      let currentIds: string[] = result.object_ids ?? [];
      let previousIds: string[] = (ctx.state?.knownIds as string[]) ?? [];

      let addedIds = currentIds.filter(id => !previousIds.includes(id));
      let removedIds = previousIds.filter(id => !currentIds.includes(id));

      let inputs = [
        ...addedIds.map(id => ({ changeType: 'added' as const, transformationId: id })),
        ...removedIds.map(id => ({ changeType: 'removed' as const, transformationId: id }))
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
          let result = await fetchTransformation(api, {
            transformationId: ctx.input.transformationId
          });
          let obj = result.object ?? result;
          name = obj.name;
          description = obj.description;
        } catch {
          // Transformation details may not be available
        }
      }

      return {
        type: `transformation.${ctx.input.changeType}`,
        id: `transformation.${ctx.input.changeType}.${ctx.input.transformationId}`,
        output: {
          transformationId: ctx.input.transformationId,
          name,
          description
        }
      };
    }
  })
  .build();
