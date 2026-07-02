import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { spec } from '../spec';

export let sendChannelMessage = SlateTool.create(spec, {
  name: 'Send Channel Message',
  key: 'send_channel_message',
  description: `Send a message to a channel in a Microsoft Team. Supports plain text and HTML content. Can also reply to an existing message thread by providing a parent message ID.`,
  instructions: [
    'Set contentType to "html" if your content includes HTML formatting.',
    'To reply to an existing message thread, provide the parentMessageId.'
  ]
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      channelId: z.string().describe('ID of the channel'),
      content: z.string().describe('Message content (text or HTML)'),
      contentType: z
        .enum(['text', 'html'])
        .default('text')
        .describe('Content type of the message'),
      parentMessageId: z.string().optional().describe('ID of the parent message to reply to')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the sent message'),
      createdDateTime: z.string().describe('Timestamp when the message was created'),
      webUrl: z.string().optional().describe('URL to view the message in Teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });

    let body = {
      body: {
        contentType: ctx.input.contentType,
        content: ctx.input.content
      }
    };

    let message: any;
    if (ctx.input.parentMessageId) {
      message = await client.replyToChannelMessage(
        ctx.input.teamId,
        ctx.input.channelId,
        ctx.input.parentMessageId,
        body
      );
    } else {
      message = await client.sendChannelMessage(ctx.input.teamId, ctx.input.channelId, body);
    }

    return {
      output: {
        messageId: message.id,
        createdDateTime: message.createdDateTime,
        webUrl: message.webUrl
      },
      message: ctx.input.parentMessageId
        ? `Reply sent to message thread.`
        : `Message sent to channel.`
    };
  })
  .build();
