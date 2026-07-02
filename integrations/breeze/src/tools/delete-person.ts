import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deletePerson = SlateTool.create(spec, {
  name: 'Delete Person',
  key: 'delete_person',
  description: `Permanently delete a person record from the church database by their ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      personId: z.string().describe('ID of the person to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.deletePerson(ctx.input.personId);

    return {
      output: { success: result === true || result === 'true' },
      message: `Deleted person (ID: ${ctx.input.personId}).`
    };
  })
  .build();
