import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteMessages = SlateTool.create(spec, {
  name: 'Delete Messages',
  key: 'delete_messages',
  description: `Delete one or more messages from a Revolt channel. Provide a single message ID or an array of message IDs for bulk deletion. Requires appropriate permissions.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel containing the messages'),
      messageIds: z.array(z.string()).min(1).describe('IDs of the messages to delete')
    })
  )
  .output(
    z.object({
      deletedCount: z.number().describe('Number of messages deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.messageIds.length === 1) {
      await client.deleteMessage(ctx.input.channelId, ctx.input.messageIds[0]!);
    } else {
      await client.bulkDeleteMessages(ctx.input.channelId, ctx.input.messageIds);
    }

    return {
      output: {
        deletedCount: ctx.input.messageIds.length
      },
      message: `Deleted ${ctx.input.messageIds.length} message(s) from channel \`${ctx.input.channelId}\``
    };
  })
  .build();
