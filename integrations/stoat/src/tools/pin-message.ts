import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let pinMessage = SlateTool.create(spec, {
  name: 'Pin / Unpin Message',
  key: 'pin_message',
  description: `Pin or unpin a message in a Revolt channel. Pinned messages are highlighted and easily accessible for all channel members.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel containing the message'),
      messageId: z.string().describe('ID of the message to pin or unpin'),
      action: z.enum(['pin', 'unpin']).describe('Whether to pin or unpin the message')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'pin') {
      await client.pinMessage(ctx.input.channelId, ctx.input.messageId);
    } else {
      await client.unpinMessage(ctx.input.channelId, ctx.input.messageId);
    }

    return {
      output: { success: true },
      message: `Message \`${ctx.input.messageId}\` ${ctx.input.action === 'pin' ? 'pinned' : 'unpinned'} in channel \`${ctx.input.channelId}\``
    };
  })
  .build();
