import { SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { spec } from '../spec';

export let searchModels = SlateTool.create(spec, {
  name: 'Search Models',
  key: 'search_models',
  description: `Search and discover available model endpoints on Fal.ai.
Supports listing all models, searching by text query or category, and looking up specific models by endpoint ID.
Returns model metadata including name, description, category, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Free-text search query to filter models by name, description, or category'),
      category: z
        .string()
        .optional()
        .describe('Filter models by category, e.g. "text-to-image", "image-to-video"'),
      endpointId: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Specific endpoint ID(s) to look up, e.g. "fal-ai/flux/dev"'),
      limit: z.number().optional().describe('Maximum number of models to return'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      models: z
        .array(
          z.object({
            endpointId: z.string().describe('Unique model endpoint identifier'),
            displayName: z.string().optional().describe('Human-readable model name'),
            category: z
              .string()
              .optional()
              .describe('Model category such as text-to-image, image-to-video'),
            description: z.string().optional().describe('Model description'),
            status: z.string().optional().describe('Model status (e.g. active)'),
            thumbnailUrl: z.string().optional().describe('URL of the model thumbnail image')
          })
        )
        .describe('List of matching models'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for fetching the next page of results'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FalClient(ctx.auth.token);

    ctx.progress('Searching models...');
    let result = await client.searchModels({
      query: ctx.input.query,
      category: ctx.input.category,
      endpointId: ctx.input.endpointId,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let models = result.models.map(m => ({
      endpointId: m.endpointId,
      displayName: m.metadata.display_name,
      category: m.metadata.category,
      description: m.metadata.description,
      status: m.metadata.status,
      thumbnailUrl: m.metadata.thumbnail_url
    }));

    return {
      output: {
        models,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore
      },
      message: `Found **${models.length}** model(s).${result.hasMore ? ' More results available.' : ''}${models
        .slice(0, 5)
        .map(
          m => `\n- **${m.displayName || m.endpointId}** (${m.category || 'unknown category'})`
        )
        .join('')}`
    };
  })
  .build();
