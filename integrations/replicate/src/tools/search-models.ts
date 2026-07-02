import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchModels = SlateTool.create(spec, {
  name: 'Search Models',
  key: 'search_models',
  description: `Search for public models, collections, and documentation on Replicate. Returns results ranked by relevance.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query text'),
      limit: z.number().optional().describe('Maximum number of results (1-50, default 20)')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          url: z.string().optional().describe('URL of the result'),
          owner: z.string().optional().describe('Owner of the model'),
          modelName: z.string().optional().describe('Name of the model'),
          description: z.string().optional().nullable().describe('Model description'),
          runCount: z.number().optional().describe('Total run count'),
          coverImageUrl: z.string().optional().nullable().describe('Cover image URL'),
          isOfficial: z.boolean().optional().describe('Whether this is an official model')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.search(ctx.input.query, ctx.input.limit);

    let results = (result.results || []).map((r: any) => ({
      url: r.url,
      owner: r.owner,
      modelName: r.name,
      description: r.description || r.generated_description,
      runCount: r.run_count,
      coverImageUrl: r.cover_image_url,
      isOfficial: r.is_official
    }));

    return {
      output: { results },
      message: `Found **${results.length}** results for "${ctx.input.query}".`
    };
  })
  .build();
