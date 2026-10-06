import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listModels = SlateTool.create(spec, {
  key: 'list_models',
  name: 'List Models',
  description:
    'Discover current TextCortex model IDs for writing, rewriting, summarizing, translating, and code generation.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      models: z.array(
        z.object({
          id: z.string(),
          created: z.number(),
          ownedBy: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const models = await new Client({ token: ctx.auth.token }).listModels();
    return {
      output: {
        models: models.map(model => ({
          id: model.id,
          created: model.created,
          ownedBy: model.owned_by
        }))
      },
      message: `Found ${models.length} available TextCortex models.`
    };
  })
  .build();
