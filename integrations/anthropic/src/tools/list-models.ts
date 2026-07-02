import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnthropicClient } from '../lib/client';
import { spec } from '../spec';

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List available Claude models and their details. Retrieve information about context window size, capabilities, and model identifiers.
Optionally fetch details for a specific model by providing its ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .optional()
        .describe(
          'Specific model ID to retrieve details for. If omitted, lists all available models.'
        ),
      limit: z.number().optional().describe('Maximum number of models to return when listing'),
      afterId: z
        .string()
        .optional()
        .describe('Pagination cursor: return models after this ID'),
      beforeId: z
        .string()
        .optional()
        .describe('Pagination cursor: return models before this ID')
    })
  )
  .output(
    z.object({
      models: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of available models (when listing)'),
      model: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Single model details (when fetching by ID)'),
      hasMore: z
        .boolean()
        .optional()
        .describe('Whether more models are available for pagination')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnthropicClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    if (ctx.input.modelId) {
      let model = await client.getModel(ctx.input.modelId);
      return {
        output: {
          model,
          models: undefined,
          hasMore: undefined
        },
        message: `Retrieved details for model **${ctx.input.modelId}**.`
      };
    }

    let result = await client.listModels({
      limit: ctx.input.limit,
      afterId: ctx.input.afterId,
      beforeId: ctx.input.beforeId
    });

    return {
      output: {
        models: result.models,
        model: undefined,
        hasMore: result.hasMore
      },
      message: `Found **${result.models.length}** available model(s).${result.hasMore ? ' More models available with pagination.' : ''}`
    };
  })
  .build();
