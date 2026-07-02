import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import { mapActor, paginationInput } from './shared';

export let listActors = SlateTool.create(spec, {
  name: 'List Actors',
  key: 'list_actors',
  description: `List Actors owned by the authenticated Apify account. Use Search Store Actors when you need to discover public Apify Store Actors.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...paginationInput
    })
  )
  .output(
    z.object({
      actors: z
        .array(
          z.object({
            actorId: z.string().describe('Actor ID'),
            name: z.string().optional().describe('Actor name'),
            username: z.string().optional().describe('Owner username'),
            title: z.string().optional().describe('Actor display title'),
            description: z.string().optional().describe('Short description'),
            isPublic: z.boolean().optional().describe('Whether the Actor is public'),
            createdAt: z.string().optional().describe('ISO timestamp of creation'),
            modifiedAt: z.string().optional().describe('ISO timestamp of last modification'),
            defaultRunOptions: z.record(z.string(), z.any()).optional(),
            stats: z.record(z.string(), z.any()).optional()
          })
        )
        .describe('Account Actors'),
      total: z.number().describe('Total Actors matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });
    let result = await client.listActors({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      desc: ctx.input.descending
    });

    let actors = result.items.map(mapActor);

    return {
      output: { actors, total: result.total },
      message: `Found **${result.total}** account Actor(s), showing **${actors.length}**.`
    };
  })
  .build();
