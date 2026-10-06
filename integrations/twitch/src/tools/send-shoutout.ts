import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { validateInput } from '../lib/contracts';
import { spec } from '../spec';

export let sendShoutout = SlateTool.create(spec, {
  name: 'Send Shoutout',
  key: 'send_shoutout',
  description: `Send a shoutout to another broadcaster. Shoutouts promote another channel by displaying it in chat and the viewer's activity feed.`,
  constraints: [
    'The broadcaster must be live to send a shoutout.',
    'At most one shoutout every 2 minutes; the same target has a 60-minute cooldown.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      fromBroadcasterId: z.string().describe('Your broadcaster user ID'),
      toBroadcasterId: z.string().describe('Broadcaster to shout out')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    validateInput('send_shoutout', ctx.input, [ctx.auth.token]);
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId, ctx.auth.userId);
    let user = await client.getAuthenticatedUser();

    await client.sendShoutout(ctx.input.fromBroadcasterId, ctx.input.toBroadcasterId, user.id);

    return {
      output: { success: true },
      message: `Sent shoutout to broadcaster \`${ctx.input.toBroadcasterId}\``
    };
  })
  .build();
