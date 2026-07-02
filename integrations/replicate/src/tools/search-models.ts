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
      query: z.string().optional().describe('Search query evaluated by Replicate'),
      results: z.array(
        z.object({
          url: z.string().optional().describe('URL of the result'),
          owner: z.string().optional().describe('Owner of the model'),
          modelName: z.string().optional().describe('Name of the model'),
          description: z.string().optional().nullable().describe('Model description'),
          runCount: z.number().optional().describe('Total run count'),
          coverImageUrl: z.string().optional().nullable().describe('Cover image URL'),
          isOfficial: z.boolean().optional().describe('Whether this is an official model'),
          generatedDescription: z
            .string()
            .optional()
            .nullable()
            .describe('AI-generated detailed description from search metadata'),
          tags: z.array(z.string()).optional().describe('Search metadata tags'),
          score: z.number().optional().nullable().describe('Search relevance score')
        })
      ),
      collections: z
        .array(
          z.object({
            slug: z.string().describe('Collection slug'),
            collectionName: z.string().describe('Collection display name'),
            description: z.string().optional().describe('Collection description'),
            models: z
              .array(z.string())
              .optional()
              .nullable()
              .describe('Model IDs in the collection')
          })
        )
        .optional()
        .describe('Matching collections'),
      pages: z
        .array(
          z.object({
            pageName: z.string().describe('Documentation page title'),
            href: z.string().describe('Documentation page path')
          })
        )
        .optional()
        .describe('Matching documentation pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.search(ctx.input.query, ctx.input.limit);

    let results = (result.models || []).map((r: any) => ({
      url: r.model?.url,
      owner: r.model?.owner,
      modelName: r.model?.name,
      description: r.model?.description || r.metadata?.generated_description,
      runCount: r.model?.run_count,
      coverImageUrl: r.model?.cover_image_url,
      isOfficial: r.model?.is_official,
      generatedDescription: r.metadata?.generated_description,
      tags: r.metadata?.tags,
      score: r.metadata?.score
    }));
    let collections = (result.collections || []).map((c: any) => ({
      slug: c.slug,
      collectionName: c.name,
      description: c.description,
      models: c.models
    }));
    let pages = (result.pages || []).map((p: any) => ({
      pageName: p.name,
      href: p.href
    }));

    return {
      output: { query: result.query, results, collections, pages },
      message: `Found **${results.length}** models, **${collections.length}** collections, and **${pages.length}** docs pages for "${ctx.input.query}".`
    };
  })
  .build();

export let listPublicModels = SlateTool.create(spec, {
  name: 'List Public Models',
  key: 'list_public_models',
  description: `List public models on Replicate with sorting options. Use Search Models when you already have a query.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      sortBy: z
        .enum(['model_created_at', 'latest_version_created_at'])
        .optional()
        .describe('Field to sort public models by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      models: z.array(
        z.object({
          owner: z.string().describe('Model owner'),
          modelName: z.string().describe('Model name'),
          description: z.string().optional().nullable().describe('Model description'),
          visibility: z.string().optional().describe('Model visibility'),
          url: z.string().optional().describe('Model page URL'),
          runCount: z.number().optional().describe('Total run count'),
          isOfficial: z.boolean().optional().describe('Whether this is an official model'),
          coverImageUrl: z.string().optional().nullable().describe('Cover image URL'),
          latestVersionId: z.string().optional().nullable().describe('Latest version ID')
        })
      ),
      nextCursor: z.string().optional().nullable().describe('Cursor for next page'),
      previousCursor: z.string().optional().nullable().describe('Cursor for previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listModels({
      cursor: ctx.input.cursor,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });
    let models = (result.results || []).map((model: any) => ({
      owner: model.owner,
      modelName: model.name,
      description: model.description,
      visibility: model.visibility,
      url: model.url,
      runCount: model.run_count,
      isOfficial: model.is_official,
      coverImageUrl: model.cover_image_url,
      latestVersionId: model.latest_version?.id
    }));
    let nextCursor = result.next ? new URL(result.next).searchParams.get('cursor') : null;
    let previousCursor = result.previous
      ? new URL(result.previous).searchParams.get('cursor')
      : null;

    return {
      output: { models, nextCursor, previousCursor },
      message: `Found **${models.length}** public models.`
    };
  })
  .build();
