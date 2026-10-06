import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const deleteModel = SlateTool.create(spec, {
  key: 'delete_model',
  name: 'Delete Model',
  description:
    'Delete a Hightouch model by ID. Remove dependent syncs first; this does not delete warehouse data.',
  tags: { destructive: true }
})
  .input(
    z.object({
      modelId: z.number().describe('Model ID. Call list_models to discover models.')
    })
  )
  .output(z.object({ modelId: z.number(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client({ token: ctx.auth.token }).deleteModel(ctx.input.modelId);
    return {
      output: { modelId: ctx.input.modelId, deleted: true },
      message: `Deleted model ${ctx.input.modelId}.`
    };
  })
  .build();

export const deleteSync = SlateTool.create(spec, {
  key: 'delete_sync',
  name: 'Delete Sync',
  description:
    'Delete a Hightouch sync by ID. This removes its configuration and future scheduled execution; it does not undo data already delivered to a destination.',
  tags: { destructive: true }
})
  .input(
    z.object({ syncId: z.number().describe('Sync ID. Call list_syncs to discover syncs.') })
  )
  .output(z.object({ syncId: z.number(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client({ token: ctx.auth.token }).deleteSync(ctx.input.syncId);
    return {
      output: { syncId: ctx.input.syncId, deleted: true },
      message: `Deleted sync ${ctx.input.syncId}.`
    };
  })
  .build();
