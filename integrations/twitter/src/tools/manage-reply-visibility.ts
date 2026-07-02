import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { spec } from '../spec';

export let manageReplyVisibility = SlateTool.create(spec, {
  name: 'Manage Reply Visibility',
  key: 'manage_reply_visibility',
  description: `Hide or unhide a reply to one of your posts. Hidden replies are still accessible but not shown by default in the conversation thread.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      postId: z.string().describe('ID of the reply post to hide or unhide'),
      hidden: z.boolean().describe('Set to true to hide the reply, false to unhide')
    })
  )
  .output(
    z.object({
      hidden: z.boolean().describe('Whether the reply is now hidden')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);

    if (ctx.input.hidden) {
      await client.hideReply(ctx.input.postId);
    } else {
      await client.unhideReply(ctx.input.postId);
    }

    return {
      output: { hidden: ctx.input.hidden },
      message: `${ctx.input.hidden ? 'Hid' : 'Unhid'} reply ${ctx.input.postId}.`
    };
  })
  .build();
