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
  .input(z.object({}))
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
              .describe('Organization or developer that owns the model')
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

    let result = await client.listModels();

    let models = (result.data ?? []).map(m => ({
      modelId: m.id,
      object: m.object,
      ownedBy: m.owned_by
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
