import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let modelResultSchema = z.object({
  modelId: z.string().describe('Unique model identifier'),
  name: z.string().nullable().describe('Name of the model'),
  description: z.string().nullable().describe('Description of the model'),
  state: z
    .string()
    .nullable()
    .describe('Activation state of the model (active, inactive, pending)'),
  created: z.string().nullable().describe('Creation timestamp'),
  modified: z.string().nullable().describe('Last modified timestamp')
});

export let searchModels = SlateTool.create(spec, {
  name: 'Search Models',
  key: 'search_models',
  description: `Search and list 3D models in your Matterport account. Supports full-text search across model names and descriptions. Can also retrieve archived or demo models using special query syntax.`,
  instructions: [
    'Use "*" as the query to list all models.',
    'Use "demo:true" with includeType "demo" to find demo models.',
    'Use "state:inactive" with includeType "inactive" to find archived models.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().default('*').describe('Search query string. Use "*" for all models.'),
      offset: z
        .string()
        .optional()
        .describe('Pagination offset from a previous search result'),
      includeType: z
        .enum(['demo', 'inactive'])
        .optional()
        .describe('Include special model types in results')
    })
  )
  .output(
    z.object({
      totalResults: z.number().describe('Total number of matching models'),
      nextOffset: z
        .string()
        .nullable()
        .describe('Offset for fetching the next page of results'),
      models: z.array(modelResultSchema).describe('List of matching models')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.searchModels(ctx.input.query, {
      offset: ctx.input.offset,
      include: ctx.input.includeType
    });

    let models = (result.results || []).map((m: any) => ({
      modelId: m.id,
      name: m.name,
      description: m.description,
      state: m.state,
      created: m.created,
      modified: m.modified
    }));

    return {
      output: {
        totalResults: result.totalResults || 0,
        nextOffset: result.nextOffset || null,
        models
      },
      message: `Found **${result.totalResults || 0}** models matching "${ctx.input.query}".`
    };
  })
  .build();
