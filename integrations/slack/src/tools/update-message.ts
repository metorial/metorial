import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let updateMessage = SlateTool.create(spec, {
  name: 'Update Message',
  key: 'update_message',
  description: `Update or delete an existing Slack message. Use this to edit message content or remove a message entirely.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(slackActionScopes.chatWrite)
  .input(
    z.object({
      channelId: z.string().describe('Channel ID where the message exists'),
      messageTs: z.string().describe('Timestamp of the message to update or delete'),
      action: z.enum(['update', 'delete']).describe('Whether to update or delete the message'),
      text: z.string().optional().describe('New message text (for update action)'),
      blocks: z.array(z.any()).optional().describe('New Block Kit blocks (for update action)')
    })
  )
  .output(
    z.object({
      messageTs: z.string().describe('Timestamp of the updated/deleted message'),
      channelId: z.string().describe('Channel ID of the message'),
      deleted: z.boolean().describe('Whether the message was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);

    if (ctx.input.action === 'delete') {
      await client.deleteMessage({
        channel: ctx.input.channelId,
        ts: ctx.input.messageTs
      });
      return {
        output: {
          messageTs: ctx.input.messageTs,
          channelId: ctx.input.channelId,
          deleted: true
        },
        message: `Deleted message \`${ctx.input.messageTs}\` from channel \`${ctx.input.channelId}\`.`
      };
    }

    let message = await client.updateMessage({
      channel: ctx.input.channelId,
      ts: ctx.input.messageTs,
      text: ctx.input.text,
      blocks: ctx.input.blocks
    });

    return {
      output: {
        messageTs: message.ts,
        channelId: message.channel || ctx.input.channelId,
        deleted: false
      },
      message: `Updated message \`${ctx.input.messageTs}\` in channel \`${ctx.input.channelId}\`.`
    };
  })
  .build();
