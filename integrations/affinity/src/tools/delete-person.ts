import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let deletePerson = SlateTool.create(spec, {
  name: 'Delete Person',
  key: 'delete_person',
  description: `Permanently delete a person record from Affinity. This also removes them from all lists and deletes associated data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    await client.deletePerson(ctx.input.personId);

    return {
      output: {
        success: true
      },
      message: `Deleted person with ID **${ctx.input.personId}**.`
    };
  })
  .build();
