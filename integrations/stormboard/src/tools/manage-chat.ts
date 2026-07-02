import { SlateTool } from 'slates';
import { z } from 'zod';
import { StormboardClient } from '../lib/client';
import { spec } from '../spec';

export let manageChat = SlateTool.create(spec, {
  name: 'Manage Chat',
  key: 'manage_chat',
  description: `Send and retrieve chat messages in a Storm. Use action "list" to get all messages, "unread" to get unread messages, "send" to post a new message, or "mark_read" to mark messages as read.`
})
  .input(
    z.object({
      stormId: z.string().describe('ID of the Storm'),
      action: z.enum(['list', 'unread', 'send', 'mark_read']).describe('Action to perform'),
      message: z.string().optional().describe('Message text (required for send)')
    })
  )
  .output(
    z.object({
      messages: z.array(z.any()).optional().describe('List of chat messages'),
      sentMessage: z.any().optional().describe('Sent message data'),
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StormboardClient({ token: ctx.auth.token });
    let { stormId, action, message } = ctx.input;

    if (action === 'list') {
      let messages = await client.getChatMessages(stormId);
      let list = Array.isArray(messages) ? messages : [];
      return {
        output: { messages: list, success: true },
        message: `Retrieved **${list.length}** chat message(s).`
      };
    }

    if (action === 'unread') {
      let messages = await client.getUnreadChatMessages(stormId);
      let list = Array.isArray(messages) ? messages : [];
      return {
        output: { messages: list, success: true },
        message: `Found **${list.length}** unread message(s).`
      };
    }

    if (action === 'send') {
      if (!message) {
        throw new Error('message is required for sending a chat message');
      }
      let sentMessage = await client.createChatMessage(stormId, { message });
      return {
        output: { sentMessage, success: true },
        message: `Sent chat message to Storm ${stormId}.`
      };
    }

    if (action === 'mark_read') {
      await client.markChatMessagesRead(stormId);
      return {
        output: { success: true },
        message: `Marked all chat messages as read in Storm ${stormId}.`
      };
    }

    return {
      output: { success: false },
      message: 'Unknown action.'
    };
  })
  .build();
