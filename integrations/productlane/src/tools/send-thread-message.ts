import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendThreadMessage = SlateTool.create(spec, {
  name: 'Send Thread Message',
  key: 'send_thread_message',
  description: `Send a reply message in an existing feedback thread. This can be used to respond to customer feedback or continue a conversation within a thread.`
})
  .input(
    z.object({
      threadId: z.string().describe('ID of the thread to reply to'),
      content: z.string().describe('Message content'),
      channelId: z.string().optional().describe('Slack channel ID for Slack thread replies')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the sent message'),
      threadId: z.string().describe('ID of the thread')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.sendThreadMessage(ctx.input.threadId, {
      content: ctx.input.content,
      channelId: ctx.input.channelId
    });

    return {
      output: {
        messageId: result.messageId,
        threadId: result.threadId
      },
      message: `Sent message in thread ${result.threadId}.`
    };
  })
  .build();
