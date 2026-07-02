import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubClient } from '../lib/client';
import { spec } from '../spec';

let modelSchema = z.object({
  modelId: z.string().describe('Full model ID (e.g. "username/model-name")'),
  author: z.string().optional().describe('Author/owner of the model'),
  sha: z.string().optional().describe('Latest commit SHA'),
  lastModified: z.string().optional().describe('Last modification timestamp'),
  private: z.boolean().optional().describe('Whether the model is private'),
  disabled: z.boolean().optional().describe('Whether the model is disabled'),
  gated: z.any().optional().describe('Whether the model is gated'),
  downloads: z.number().optional().describe('Total download count'),
  likes: z.number().optional().describe('Number of likes'),
  tags: z.array(z.string()).optional().describe('Tags on the model'),
  pipelineTag: z.string().optional().describe('Pipeline/task tag (e.g. "text-generation")'),
  libraryName: z.string().optional().describe('Library name (e.g. "transformers")')
});

export let searchModelsTool = SlateTool.create(spec, {
  name: 'Search Models',
  key: 'search_models',
  description: `Search for machine learning models on Hugging Face Hub. Filter by keyword, author, library framework, pipeline task, and tags. Results include model metadata such as downloads, likes, and pipeline task.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to filter models by name or description'),
      author: z
        .string()
        .optional()
        .describe('Filter by author/organization (e.g. "meta-llama", "google")'),
      library: z
        .string()
        .optional()
        .describe('Filter by ML library (e.g. "transformers", "diffusers", "pytorch")'),
      filter: z
        .string()
        .optional()
        .describe('Filter by pipeline task (e.g. "text-generation", "image-classification")'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      sort: z
        .enum(['downloads', 'likes', 'lastModified', 'trending', 'createdAt'])
        .optional()
        .describe('Sort field'),
      direction: z
        .enum(['-1', '1'])
        .optional()
        .describe('Sort direction: -1 for descending, 1 for ascending'),
      limit: z
        .number()
        .optional()
        .default(20)
        .describe('Maximum number of results (default 20)')
    })
  )
  .output(
    z.object({
      models: z.array(modelSchema).describe('List of matching models')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let results = await client.searchModels({
      search: ctx.input.search,
      author: ctx.input.author,
      library: ctx.input.library,
      filter: ctx.input.filter,
      tags: ctx.input.tags,
      sort: ctx.input.sort,
      direction: ctx.input.direction,
      limit: ctx.input.limit
    });

    let models = results.map((m: any) => ({
      modelId: m.modelId || m.id || m._id,
      author: m.author,
      sha: m.sha,
      lastModified: m.lastModified,
      private: m.private,
      disabled: m.disabled,
      gated: m.gated,
      downloads: m.downloads,
      likes: m.likes,
      tags: m.tags,
      pipelineTag: m.pipeline_tag || m.pipelineTag,
      libraryName: m.library_name || m.libraryName
    }));

    return {
      output: { models },
      message: `Found **${models.length}** model(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
