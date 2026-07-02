import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `List curated collections of models on Replicate, grouped by use case (e.g. text-to-image, super-resolution).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      collections: z.array(
        z.object({
          slug: z.string().describe('Collection slug identifier'),
          collectionName: z.string().describe('Collection display name'),
          description: z.string().optional().describe('Collection description')
        })
      ),
      nextCursor: z.string().optional().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCollections({ cursor: ctx.input.cursor });

    let collections = (result.results || []).map((c: any) => ({
      slug: c.slug,
      collectionName: c.name,
      description: c.description
    }));

    let nextCursor = result.next ? new URL(result.next).searchParams.get('cursor') : null;

    return {
      output: { collections, nextCursor },
      message: `Found **${collections.length}** collections.`
    };
  })
  .build();

export let getCollection = SlateTool.create(spec, {
  name: 'Get Collection',
  key: 'get_collection',
  description: `Get details about a specific collection, including all models in the collection.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      slug: z.string().describe('Collection slug (e.g. "text-to-image", "super-resolution")')
    })
  )
  .output(
    z.object({
      slug: z.string().describe('Collection slug'),
      collectionName: z.string().describe('Collection display name'),
      description: z.string().optional().describe('Collection description'),
      models: z.array(
        z.object({
          owner: z.string().describe('Model owner'),
          modelName: z.string().describe('Model name'),
          description: z.string().optional().nullable().describe('Model description'),
          url: z.string().optional().describe('Model page URL'),
          runCount: z.number().optional().describe('Total run count'),
          coverImageUrl: z.string().optional().nullable().describe('Cover image URL')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCollection(ctx.input.slug);

    let models = (result.models || []).map((m: any) => ({
      owner: m.owner,
      modelName: m.name,
      description: m.description,
      url: m.url,
      runCount: m.run_count,
      coverImageUrl: m.cover_image_url
    }));

    return {
      output: {
        slug: result.slug,
        collectionName: result.name,
        description: result.description,
        models
      },
      message: `Collection **${result.name}** contains **${models.length}** models.`
    };
  })
  .build();
