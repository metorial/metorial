import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePerson = SlateTool.create(spec, {
  name: 'Delete Person',
  key: 'delete_person',
  description: `Permanently deletes a person from your Folk workspace. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z.string().describe('ID of the person to delete')
    })
  )
  .output(
    z.object({
      personId: z.string().describe('ID of the deleted person')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deletePerson(ctx.input.personId);

    return {
      output: {
        personId: result.id
      },
      message: `Deleted person ${result.id}`
    };
  })
  .build();
