import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaggleClient } from '../lib/client';
import { spec } from '../spec';

let modelSchema = z
  .object({
    ref: z.string().optional().describe('Model reference'),
    title: z.string().optional().describe('Model title'),
    subtitle: z.string().optional().describe('Model subtitle'),
    url: z.string().optional().describe('Model URL'),
    author: z.string().optional().describe('Model author'),
    owner: z.string().optional().describe('Model owner'),
    slug: z.string().optional().describe('Model slug'),
    isPrivate: z.boolean().optional().describe('Whether the model is private'),
    description: z.string().optional().describe('Model description'),
    publishTime: z.string().optional().describe('Publish time'),
    instances: z
      .array(
        z
          .object({
            framework: z.string().optional(),
            overview: z.string().optional(),
            slug: z.string().optional(),
            licenseName: z.string().optional(),
            fineTunable: z.boolean().optional(),
            versionNumber: z.number().optional()
          })
          .passthrough()
      )
      .optional()
      .describe('Model variations/instances')
  })
  .passthrough();

export let searchModels = SlateTool.create(spec, {
  name: 'Search Models',
  key: 'search_models',
  description: `Search and list Kaggle models. Find models by keyword, owner, and sort by various criteria. Models support multiple variations (e.g., different frameworks like TensorFlow, PyTorch) and each variation can have multiple versions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter models'),
      owner: z.string().optional().describe('Filter by model owner username'),
      sortBy: z.string().optional().describe('Sort order for results'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      models: z.array(modelSchema).describe('List of matching models'),
      nextPageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaggleClient(ctx.auth);
    let result = await client.listModels({
      search: ctx.input.search,
      owner: ctx.input.owner,
      sortBy: ctx.input.sortBy,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let models = result?.models ?? result ?? [];
    let nextPageToken = result?.nextPageToken;

    return {
      output: { models, nextPageToken },
      message: `Found ${models.length} model(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
