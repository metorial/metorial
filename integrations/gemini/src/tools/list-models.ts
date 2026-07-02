import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let modelSchema = z.object({
  modelName: z
    .string()
    .describe('Full resource name of the model (e.g. "models/gemini-2.0-flash")'),
  displayName: z.string().describe('Human-readable display name'),
  description: z.string().optional().describe('Description of the model'),
  version: z.string().optional().describe('Model version string'),
  inputTokenLimit: z.number().optional().describe('Maximum input tokens supported'),
  outputTokenLimit: z.number().optional().describe('Maximum output tokens supported'),
  supportedGenerationMethods: z
    .array(z.string())
    .optional()
    .describe('Supported methods (e.g. "generateContent", "embedContent")'),
  temperature: z.number().optional().describe('Default temperature'),
  maxTemperature: z.number().optional().describe('Maximum allowed temperature'),
  topP: z.number().optional().describe('Default top-p value'),
  topK: z.number().optional().describe('Default top-k value')
});

let mapModel = (model: any) => ({
  modelName: model.name,
  displayName: model.displayName ?? '',
  description: model.description,
  version: model.version,
  inputTokenLimit: model.inputTokenLimit,
  outputTokenLimit: model.outputTokenLimit,
  supportedGenerationMethods: model.supportedGenerationMethods,
  temperature: model.temperature,
  maxTemperature: model.maxTemperature,
  topP: model.topP,
  topK: model.topK
});

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List available Gemini models and their capabilities. Returns model names, supported generation methods, token limits, and other metadata. Use this to discover which models are available and their specifications.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of models to return per page'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results')
    })
  )
  .output(
    z.object({
      models: z.array(modelSchema).describe('Available models'),
      nextPageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listModels({
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let models = (result.models ?? []).map(mapModel);

    return {
      output: {
        models,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${models.length}** models.${result.nextPageToken ? ' More models available on next page.' : ''}`
    };
  })
  .build();

export let getModel = SlateTool.create(spec, {
  name: 'Get Model',
  key: 'get_model',
  description: `Get metadata for a specific Gemini model, including supported generation methods, token limits, version, and generation defaults. Use this before invoking a model-specific capability such as text generation, embeddings, or token counting.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('Model ID or resource name to retrieve (e.g. "gemini-2.0-flash")')
    })
  )
  .output(modelSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let model = mapModel(await client.getModel(ctx.input.model));

    return {
      output: model,
      message: `Retrieved model **${model.modelName}**.`
    };
  })
  .build();
