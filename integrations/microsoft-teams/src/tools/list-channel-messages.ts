import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let listChannelMessages = SlateTool.create(spec, {
  name: 'List Channel Messages',
  key: 'list_channel_messages',
  description: `List recent messages in a team channel. Returns message content, sender information, and timestamps. Optionally fetch replies for a specific message.`,
  tags: {
    readOnly: true
  }
})
  .scopes(microsoftTeamsActionScopes.listChannelMessages)
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      channelId: z.string().describe('ID of the channel'),
      messageId: z
        .string()
        .optional()
        .describe('If provided, list replies to this specific message'),
      top: z.number().optional().describe('Maximum number of messages to return')
    })
  )
  .output(
    z.object({
      messages: z.array(
        z.object({
          messageId: z.string().describe('Unique identifier of the message'),
          content: z.string().nullable().describe('Message body content'),
          contentType: z.string().optional().describe('Content type (text or html)'),
          createdDateTime: z.string().describe('When the message was created'),
          senderDisplayName: z.string().nullable().describe('Display name of the sender'),
          senderUserId: z.string().nullable().describe('User ID of the sender'),
          webUrl: z.string().optional().describe('URL to the message in Teams')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });

    let messages: any[];
    if (ctx.input.messageId) {
      messages = await client.listMessageReplies(
        ctx.input.teamId,
        ctx.input.channelId,
        ctx.input.messageId
      );
    } else {
      messages = await client.listChannelMessages(
        ctx.input.teamId,
        ctx.input.channelId,
        ctx.input.top
      );
    }

    let mapped = messages.map((m: any) => ({
      messageId: m.id,
      content: m.body?.content || null,
      contentType: m.body?.contentType,
      createdDateTime: m.createdDateTime,
      senderDisplayName: m.from?.user?.displayName || null,
      senderUserId: m.from?.user?.id || null,
      webUrl: m.webUrl
    }));

    return {
      output: { messages: mapped },
      message: ctx.input.messageId
        ? `Found **${mapped.length}** replies to message.`
        : `Found **${mapped.length}** messages in channel.`
    };
  })
  .build();
