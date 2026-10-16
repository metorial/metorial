import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFloors = SlateTool.create(spec, {
  name: 'List Model Floors',
  key: 'list_floors',
  description:
    'List floor IDs, labels, and vertical sequence for a Matterport model. Use a floor ID when creating an annotation tag.',
  tags: { readOnly: true }
})
  .input(z.object({ modelId: z.string().describe('The Matterport model ID') }))
  .output(
    z.object({
      floors: z.array(
        z.object({ floorId: z.string(), label: z.string().nullable(), sequence: z.number() })
      )
    })
  )
  .handleInvocation(async ctx => {
    let floors = await new Client(ctx.auth).getFloors(ctx.input.modelId);
    let mapped = floors.map(floor => {
      if (typeof floor.sequence !== 'number' || !Number.isFinite(floor.sequence))
        throw createApiServiceError('Matterport returned an invalid floor sequence.');
      return { floorId: floor.id, label: floor.label ?? null, sequence: floor.sequence };
    });
    return { output: { floors: mapped }, message: `Found ${mapped.length} floors.` };
  })
  .build();
