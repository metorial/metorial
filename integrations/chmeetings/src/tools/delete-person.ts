import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePerson = SlateTool.create(spec, {
  name: 'Delete Person',
  key: 'delete_person',
  description: `Permanently delete a person record from ChMeetings. This action cannot be undone.`,
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
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deletePerson(ctx.input.personId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted person with ID **${ctx.input.personId}**.`
    };
  })
  .build();
