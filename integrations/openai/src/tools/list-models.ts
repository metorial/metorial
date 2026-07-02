import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List all available OpenAI models, or retrieve details about a specific model. Useful for discovering available model IDs, owners, and capabilities before making API calls.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .optional()
        .describe(
          'Specific model ID to retrieve details for. If omitted, lists all available models.'
        )
    })
  )
  .output(
    z.object({
      models: z
        .array(
          z.object({
            modelId: z.string().describe('Model identifier'),
            ownedBy: z.string().describe('Organization that owns the model'),
            createdAt: z.number().describe('Unix timestamp when the model was created')
          })
        )
        .describe('List of models')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.modelId) {
      let model = await client.getModel(ctx.input.modelId);
      return {
        output: {
          models: [
            {
              modelId: model.id,
              ownedBy: model.owned_by,
              createdAt: model.created
            }
          ]
        },
        message: `Retrieved details for model **${model.id}** (owned by ${model.owned_by}).`
      };
    }

    let result = await client.listModels();
    let models = (result.data ?? []).map((m: any) => ({
      modelId: m.id,
      ownedBy: m.owned_by,
      createdAt: m.created
    }));

    return {
      output: { models },
      message: `Found **${models.length}** available models.`
    };
  })
  .build();
