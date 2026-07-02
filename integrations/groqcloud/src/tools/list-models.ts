import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `Retrieve the list of all available models on GroqCloud. Returns model IDs, context window sizes, ownership, and status information. Useful for discovering which models are available for text generation, vision, audio, and other tasks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      activeOnly: z
        .boolean()
        .optional()
        .default(true)
        .describe('If true, only return active models')
    })
  )
  .output(
    z.object({
      models: z
        .array(
          z.object({
            modelId: z.string().describe('Model identifier used in API calls'),
            ownedBy: z.string().describe('Organization that owns the model'),
            active: z.boolean().describe('Whether the model is currently active'),
            contextWindow: z.number().describe('Maximum context window size in tokens'),
            maxCompletionTokens: z
              .number()
              .optional()
              .describe('Maximum tokens the model can generate'),
            created: z.number().describe('Unix timestamp when the model was created')
          })
        )
        .describe('List of available models'),
      totalCount: z.number().describe('Total number of models returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listModels();

    let models = result.data;
    if (ctx.input.activeOnly) {
      models = models.filter(m => m.active);
    }

    let output = models.map(m => ({
      modelId: m.id,
      ownedBy: m.owned_by,
      active: m.active,
      contextWindow: m.context_window,
      maxCompletionTokens: m.max_completion_tokens,
      created: m.created
    }));

    return {
      output: {
        models: output,
        totalCount: output.length
      },
      message: `Found **${output.length}** ${ctx.input.activeOnly ? 'active ' : ''}models on GroqCloud.`
    };
  })
  .build();
