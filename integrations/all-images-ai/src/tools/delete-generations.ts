import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteGenerations = SlateTool.create(spec, {
  name: 'Delete Generations',
  key: 'delete_generations',
  description: `Delete one or more image generations by their IDs. This permanently removes the generations and their associated images.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      generationIds: z.array(z.string()).min(1).describe('IDs of the generations to delete')
    })
  )
  .output(
    z.object({
      deletedCount: z.number().describe('Number of generations deleted'),
      generationIds: z.array(z.string()).describe('IDs of deleted generations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    await client.deleteGenerations(ctx.input.generationIds);

    return {
      output: {
        deletedCount: ctx.input.generationIds.length,
        generationIds: ctx.input.generationIds
      },
      message: `Deleted **${ctx.input.generationIds.length}** generation(s).`
    };
  })
  .build();
