import { SlateTool } from 'slates';
import { z } from 'zod';
import { graphAuthMethodKeys } from '../auth';
import { GraphClient } from '../lib/client';
import {
  buildMessagePayload,
  importanceInputSchema,
  mentionsInputSchema
} from '../lib/messages';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

// https://learn.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-1.0
// https://learn.microsoft.com/en-us/graph/api/chatmessage-post-replies?view=graph-rest-1.0
export let sendChannelMessage = SlateTool.create(spec, {
  name: 'Send Channel Message',
  key: 'send_channel_message',
  description: `Send a message to a channel in a Microsoft Team. Supports plain text and HTML content, @mentions, a subject line, and importance. Can also reply to an existing message thread by providing a parent message ID.`,
  instructions: [
    'Set contentType to "html" if your content includes HTML formatting or mentions.',
    'To mention users, set contentType to "html", put <at id="0">Name</at> (then id="1", ...) in the content, and list the users in mentions in the same order.',
    'To reply to an existing message thread, provide the parentMessageId. subject applies only to new posts.'
  ]
})
  .scopes(microsoftTeamsActionScopes.sendChannelMessage)
  .authMethods(graphAuthMethodKeys)
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      channelId: z.string().describe('ID of the channel'),
      content: z.string().describe('Message content (text or HTML)'),
      contentType: z
        .enum(['text', 'html'])
        .default('text')
        .describe('Content type of the message'),
      parentMessageId: z.string().optional().describe('ID of the parent message to reply to'),
      subject: z
        .string()
        .optional()
        .describe('Subject line for a new channel post (ignored for replies)'),
      importance: importanceInputSchema,
      mentions: mentionsInputSchema
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

    let body = buildMessagePayload({
      content: ctx.input.content,
      contentType: ctx.input.contentType,
      mentions: ctx.input.mentions,
      subject: ctx.input.parentMessageId ? undefined : ctx.input.subject,
      importance: ctx.input.importance
    });

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
        webUrl: message.webUrl ?? undefined
      },
      message: ctx.input.parentMessageId
        ? `Reply sent to message thread.`
        : `Message sent to channel.`
    };
  })
  .build();
