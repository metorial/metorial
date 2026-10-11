import { createApiServiceError, SlateTool } from 'slates';
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

let sameUser = (
  value: string,
  me: { id?: string; userPrincipalName?: string; mail?: string }
) => {
  let normalized = value.trim().toLowerCase();
  return [me.id, me.userPrincipalName, me.mail].some(
    candidate => typeof candidate === 'string' && candidate.toLowerCase() === normalized
  );
};

// https://learn.microsoft.com/en-us/graph/api/chat-post?view=graph-rest-1.0
// https://learn.microsoft.com/en-us/graph/api/chat-post-messages?view=graph-rest-1.0
export let sendChatMessage = SlateTool.create(spec, {
  name: 'Send Chat Message',
  key: 'send_chat_message',
  description: `Send a message in an existing chat. Supports plain text and HTML content, @mentions, and importance. Can also create a new one-on-one or group chat and send a message in a single step.`,
  instructions: [
    'To send to an existing chat, provide chatId.',
    'To create a new chat and send a message, provide memberUserIds instead of chatId. One other user creates (or reuses) a one-on-one chat; two or more create a group chat.',
    'To mention users, set contentType to "html", put <at id="0">Name</at> (then id="1", ...) in the content, and list the users in mentions in the same order.'
  ]
})
  .scopes(microsoftTeamsActionScopes.sendChatMessage)
  .authMethods(graphAuthMethodKeys)
  .input(
    z.object({
      chatId: z.string().optional().describe('ID of an existing chat to send the message to'),
      memberUserIds: z
        .array(z.string())
        .optional()
        .describe(
          'User IDs or user principal names to create a new chat with (if chatId not provided). The authenticated user is added automatically.'
        ),
      topic: z
        .string()
        .optional()
        .describe('Topic for a new group chat (only used when creating a group chat)'),
      content: z.string().describe('Message content'),
      contentType: z
        .enum(['text', 'html'])
        .default('text')
        .describe('Content type of the message'),
      importance: importanceInputSchema,
      mentions: mentionsInputSchema
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

    let messageBody = buildMessagePayload({
      content: ctx.input.content,
      contentType: ctx.input.contentType,
      mentions: ctx.input.mentions,
      importance: ctx.input.importance
    });

    let chatId = ctx.input.chatId;

    if (!chatId) {
      let missingTarget = () =>
        createApiServiceError(
          'Provide chatId, or memberUserIds with at least one user other than yourself.',
          { reason: 'microsoft_teams_chat_target_missing' }
        );
      let requested = (ctx.input.memberUserIds ?? [])
        .map(id => id.trim())
        .filter(id => id.length > 0);
      if (requested.length === 0) throw missingTarget();

      let me = await client.getMe();
      let others = [...new Set(requested.filter(id => !sameUser(id, me)))];
      if (others.length === 0) throw missingTarget();

      // A one-on-one chat has exactly two members; group chats have three or more.
      let chatType = others.length === 1 ? 'oneOnOne' : 'group';
      let chatBody = {
        chatType,
        ...(chatType === 'group' && ctx.input.topic ? { topic: ctx.input.topic } : {}),
        members: [me.id, ...others].map((uid: string) => ({
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${uid}')`
        }))
      };

      let chat = await client.createChat(chatBody);
      chatId = chat.id as string;
    }

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
