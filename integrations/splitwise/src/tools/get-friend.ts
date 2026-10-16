import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFriend = SlateTool.create(spec, {
  name: 'Get Friend',
  key: 'get_friend',
  description:
    'Retrieve a friend and their overall and per-group balances. Call list_friends to discover friend IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ friendId: z.number().describe('Friend user ID from list_friends') }))
  .output(
    z.object({
      friend: z
        .record(z.string(), z.unknown())
        .describe('Friend details exactly as returned by Splitwise')
    })
  )
  .handleInvocation(async ctx => {
    let friend = await new Client({ token: ctx.auth.token }).getFriend(ctx.input.friendId);
    return { output: { friend }, message: 'Retrieved friend details.' };
  })
  .build();
