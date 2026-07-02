import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

export let listActors = SlateTool.create(spec, {
  name: 'List Actors',
  key: 'list_actors',
  description: `List Actors in your Apify account. Returns Actor metadata including IDs, names, descriptions, and run statistics.
Use this to discover available Actors, find Actor IDs for running, or review your Actor inventory.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      myActorsOnly: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'If true, only list your own Actors. If false, also includes Actors from the Store.'
        ),
      limit: z.number().optional().default(25).describe('Maximum number of Actors to return'),
      offset: z.number().optional().default(0).describe('Pagination offset'),
      descending: z
        .boolean()
        .optional()
        .default(true)
        .describe('Sort in descending order by creation date')
    })
  )
  .output(
    z.object({
      actors: z
        .array(
          z.object({
            actorId: z.string().describe('Actor ID'),
            name: z.string().describe('Actor name'),
            username: z.string().optional().describe('Owner username'),
            title: z.string().optional().describe('Actor display title'),
            description: z.string().optional().describe('Short description'),
            runCount: z.number().optional().describe('Total number of runs'),
            lastRunAt: z.string().optional().describe('ISO timestamp of last run'),
            createdAt: z.string().optional().describe('ISO timestamp of creation'),
            modifiedAt: z.string().optional().describe('ISO timestamp of last modification')
          })
        )
        .describe('List of Actors'),
      total: z.number().describe('Total number of Actors matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });
    let result = await client.listActors({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      desc: ctx.input.descending,
      my: ctx.input.myActorsOnly
    });

    let actors = result.items.map(item => ({
      actorId: item.id,
      name: item.name,
      username: item.username,
      title: item.title,
      description: item.description,
      runCount: item.stats?.totalRuns,
      lastRunAt: item.stats?.lastRunStartedAt,
      createdAt: item.createdAt,
      modifiedAt: item.modifiedAt
    }));

    return {
      output: { actors, total: result.total },
      message: `Found **${result.total}** Actor(s), showing **${actors.length}**.`
    };
  })
  .build();
