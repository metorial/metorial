import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

let mapStoreActor = (actor: Record<string, any>) => ({
  actorId: actor.id ?? actor.actorId,
  name: actor.name,
  username: actor.username,
  title: actor.title,
  description: actor.description,
  categories: actor.categories,
  pricingModel: actor.pricingModel,
  stats: actor.stats,
  createdAt: actor.createdAt,
  modifiedAt: actor.modifiedAt
});

export let searchStoreActors = SlateTool.create(spec, {
  name: 'Search Store Actors',
  key: 'search_store_actors',
  description: `Search public Apify Store Actors. Use this to discover Actor IDs or full names before running a public scraper or automation Actor.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search text for Actor title/name/description'),
      category: z.string().optional().describe('Optional Store category filter'),
      username: z.string().optional().describe('Optional Actor owner username filter'),
      limit: z.number().int().positive().optional().default(10),
      offset: z.number().int().min(0).optional().default(0)
    })
  )
  .output(
    z.object({
      actors: z.array(z.record(z.string(), z.any())).describe('Matching Store Actors'),
      total: z.number().describe('Total matching Store Actors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });
    let result = await client.searchStoreActors({
      search: ctx.input.query,
      category: ctx.input.category,
      username: ctx.input.username,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let actors = result.items.map(mapStoreActor);

    return {
      output: { actors, total: result.total },
      message: `Found **${result.total}** Store Actor(s), showing **${actors.length}**.`
    };
  })
  .build();
