import { SlateTool } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { spec } from '../spec';

let modelSchema = z.object({
  modelId: z.string().describe('Unique model identifier'),
  ownedBy: z.string().optional().describe('Model owner'),
  name: z.string().optional().describe('Display name'),
  description: z.string().optional().describe('Model description'),
  maxContextLength: z.number().optional().describe('Maximum context window size in tokens'),
  aliases: z.array(z.string()).optional().describe('Model aliases (e.g., "-latest" suffix)'),
  capabilities: z.any().optional().describe('Model capabilities'),
  type: z.string().optional().describe('Model type'),
  createdAt: z.number().optional().describe('Creation timestamp')
});

export let listModelsTool = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List available Mistral AI models including both Mistral-provided and user fine-tuned models. Returns model details such as capabilities, context length, aliases, and ownership.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      provider: z.string().optional().describe('Optional provider filter'),
      model: z.string().optional().describe('Optional model ID/name filter')
    })
  )
  .output(
    z.object({
      models: z.array(modelSchema).describe('Available models')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.listModels({
      provider: ctx.input.provider,
      model: ctx.input.model
    });

    let models = (result.data || []).map((m: any) => ({
      modelId: m.id,
      ownedBy: m.owned_by,
      name: m.name,
      description: m.description,
      maxContextLength: m.max_context_length,
      aliases: m.aliases,
      capabilities: m.capabilities,
      type: m.type,
      createdAt: m.created
    }));

    return {
      output: { models },
      message: `Found **${models.length}** available model(s).`
    };
  })
  .build();

export let getModelTool = SlateTool.create(spec, {
  name: 'Get Model',
  key: 'get_model',
  description: `Retrieve metadata for a specific Mistral AI model, including capabilities, context length, aliases, ownership, and fine-tuned model details when available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('Model ID to retrieve')
    })
  )
  .output(modelSchema)
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let model = await client.getModel(ctx.input.modelId);
    let output = {
      modelId: model.id,
      ownedBy: model.owned_by,
      name: model.name,
      description: model.description,
      maxContextLength: model.max_context_length,
      aliases: model.aliases,
      capabilities: model.capabilities,
      type: model.type ?? model.TYPE,
      createdAt: model.created
    };

    return {
      output,
      message: `Retrieved model **${output.modelId}**.`
    };
  })
  .build();
