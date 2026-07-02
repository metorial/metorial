import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getModel = SlateTool.create(spec, {
  name: 'Get Model',
  key: 'get_model',
  description: `Retrieve detailed information about a specific model on GroqCloud, including context window size, max completion tokens, and availability status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .describe('Model identifier (e.g., "llama-3.3-70b-versatile", "whisper-large-v3")')
    })
  )
  .output(
    z.object({
      modelId: z.string().describe('Model identifier'),
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
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let model = await client.getModel(ctx.input.modelId);

    return {
      output: {
        modelId: model.id,
        ownedBy: model.owned_by,
        active: model.active,
        contextWindow: model.context_window,
        maxCompletionTokens: model.max_completion_tokens,
        created: model.created
      },
      message: `Model **${model.id}** owned by ${model.owned_by}. Context window: ${model.context_window} tokens. Active: ${model.active}.`
    };
  })
  .build();
