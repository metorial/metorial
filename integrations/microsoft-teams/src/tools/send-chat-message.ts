import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let sendChatMessage = SlateTool.create(spec, {
  name: 'Send Chat Message',
  key: 'send_chat_message',
  description: `Send a message in an existing chat. Supports plain text and HTML content. Can also create a new one-on-one or group chat and send a message in a single step.`,
  instructions: [
    'To send to an existing chat, provide chatId.',
    'To create a new chat and send a message, provide memberUserIds instead of chatId.'
  ]
})
  .scopes(microsoftTeamsActionScopes.sendChatMessage)
  .input(
    z.object({
      chatId: z.string().optional().describe('ID of an existing chat to send the message to'),
      memberUserIds: z
        .array(z.string())
        .optional()
        .describe(
          'User IDs to create a new chat with (if chatId not provided). Include the authenticated user if needed.'
        ),
      content: z.string().describe('Message content'),
      contentType: z
        .enum(['text', 'html'])
        .default('text')
        .describe('Content type of the message')
    })
  )
  .output(
    z.object({
      chatId: z.string().describe('ID of the chat'),
      messageId: z.string().describe('ID of the sent message'),
      createdDateTime: z.string().describe('Timestamp when the message was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });

    let chatId = ctx.input.chatId;

    if (!chatId && ctx.input.memberUserIds && ctx.input.memberUserIds.length > 0) {
      let chatType = ctx.input.memberUserIds.length === 1 ? 'oneOnOne' : 'group';
      let me = await client.getMe();

      let allMemberIds = ctx.input.memberUserIds.includes(me.id)
        ? ctx.input.memberUserIds
        : [me.id, ...ctx.input.memberUserIds];

      let chatBody = {
        chatType,
        members: allMemberIds.map((uid: string) => ({
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${uid}')`
        }))
      };

      let chat = await client.createChat(chatBody);
      chatId = chat.id;
    }

    if (!chatId) {
      throw new Error('Either chatId or memberUserIds must be provided');
    }

    let messageBody = {
      body: {
        contentType: ctx.input.contentType,
        content: ctx.input.content
      }
    };

    let message = await client.sendChatMessage(chatId, messageBody);

    return {
      output: {
        chatId,
        messageId: message.id,
        createdDateTime: message.createdDateTime
      },
      message: `Message sent in chat.`
    };
  })
  .build();
