import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { modelSchema, normalizeModel } from './list-models';

export let listEmbeddingModels = SlateTool.create(spec, {
  name: 'List Embedding Models',
  key: 'list_embedding_models',
  description:
    'List OpenRouter models available through the embeddings router, including pricing, context length, architecture, and supported metadata.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search term to filter embedding models by name or ID'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of models to return (default: 50)')
    })
  )
  .output(
    z.object({
      models: z.array(modelSchema).describe('Available embedding models'),
      totalCount: z.number().describe('Total number of matching embedding models')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let models = (await client.listEmbeddingModels()).map(normalizeModel);

    if (ctx.input.search) {
      let searchLower = ctx.input.search.toLowerCase();
      models = models.filter(
        model =>
          model.modelId.toLowerCase().includes(searchLower) ||
          model.name?.toLowerCase().includes(searchLower)
      );
    }

    let totalCount = models.length;
    let maxResults = ctx.input.maxResults || 50;
    models = models.slice(0, maxResults);

    return {
      output: {
        models,
        totalCount
      },
      message: `Found **${totalCount}** embedding model(s). Showing ${models.length}.`
    };
  })
  .build();
