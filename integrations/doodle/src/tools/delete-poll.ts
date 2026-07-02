import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePollTool = SlateTool.create(spec, {
  name: 'Delete Poll',
  key: 'delete_poll',
  description: `Permanently delete a Doodle poll. Requires the poll's admin key, which is returned when the poll is created.`,
  instructions: [
    'The admin key is provided when a poll is created. Store it securely as it cannot be retrieved later.',
    'This action is irreversible — the poll and all participant data will be permanently removed.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      pollId: z.string().describe('The unique identifier of the poll to delete'),
      adminKey: z.string().describe('The admin key for the poll (received at creation)')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the poll was successfully deleted'),
      pollId: z.string().describe('The ID of the deleted poll')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deletePoll(ctx.input.pollId, ctx.input.adminKey);

    return {
      output: {
        deleted: true,
        pollId: ctx.input.pollId
      },
      message: `Deleted poll \`${ctx.input.pollId}\`.`
    };
  })
  .build();
