import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteConference = SlateTool.create(spec, {
  name: 'Delete Conference',
  key: 'delete_conference',
  description: `Permanently deletes a conference room. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the conference room to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteConference(ctx.input.roomId);

    return {
      output: { success: true },
      message: `Deleted conference room **${ctx.input.roomId}**.`
    };
  })
  .build();
