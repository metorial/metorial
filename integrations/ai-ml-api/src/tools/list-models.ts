import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `Retrieve the full list of available AI/ML models across all categories (text, image, video, speech, embeddings, moderation, etc.).
Use this to discover available model IDs before making generation requests.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .optional()
        .describe('Filter by model ID or alias; comma-separated values use OR'),
      type: z
        .string()
        .optional()
        .describe('Filter by endpoint type, e.g. openai/chat-completions'),
      tags: z.string().optional().describe('Filter by tags, e.g. playground:video'),
      modalities: z
        .string()
        .optional()
        .describe('Filter by input or output modality, e.g. video'),
      capabilities: z
        .string()
        .optional()
        .describe('Filter by capabilities, e.g. image_to_video'),
      include: z
        .enum(['pricing', 'modalities', 'capabilities', 'all'])
        .optional()
        .describe('Include additional model details')
    })
  )
  .output(
    z.object({
      models: z
        .array(
          z.object({
            modelId: z.string().describe('The model identifier to use in API requests'),
            object: z.string().describe('Object type'),
            ownedBy: z
              .string()
              .optional()
              .describe('Organization or developer that owns the model'),
            name: z.string().optional().describe('Human-readable model name'),
            type: z.string().optional().describe('Endpoint type serving this model'),
            aliases: z.array(z.string()).optional().describe('Accepted alternate model IDs'),
            tags: z.array(z.string()).optional(),
            capabilities: z.array(z.string()).optional(),
            modalities: z
              .object({
                input: z.array(z.string()).optional(),
                output: z.array(z.string()).optional()
              })
              .optional(),
            docsUrl: z.string().optional().describe('Official model API documentation URL'),
            pricing: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Provider pricing; read price together with its per-unit quantity')
          })
        )
        .describe('Available models'),
      totalCount: z.number().describe('Total number of available models')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listModels({
      id: ctx.input.modelId,
      type: ctx.input.type,
      tags: ctx.input.tags,
      modalities: ctx.input.modalities,
      capabilities: ctx.input.capabilities,
      include: ctx.input.include
    });

    let models = (result.data ?? []).map(m => ({
      modelId: m.id,
      object: m.object ?? 'model',
      ownedBy: m.owned_by ?? m.info?.developer,
      name: m.info?.name,
      type: m.type,
      aliases: m.aliases,
      tags: m.tags,
      capabilities: m.capabilities,
      modalities: m.modalities,
      docsUrl: m.info?.docsUrl,
      pricing: m.pricing
    }));

    return {
      output: {
        models,
        totalCount: models.length
      },
      message: `Retrieved **${models.length}** available models.`
    };
  })
  .build();
