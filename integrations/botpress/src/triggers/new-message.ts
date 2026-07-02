import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { RuntimeClient } from '../lib/client';
import { spec } from '../spec';

export let newMessageTrigger = SlateTrigger.create(spec, {
  name: 'New Message',
  key: 'new_message',
  description: 'Triggers when new messages are sent or received in bot conversations.'
})
  .input(
    z.object({
      messageId: z.string().describe('Unique message ID'),
      conversationId: z.string().describe('Conversation the message belongs to'),
      userId: z.string().optional().describe('User who sent the message'),
      messageType: z.string().optional().describe('Message type (text, image, etc.)'),
      payload: z.record(z.string(), z.unknown()).describe('Message content and payload'),
      direction: z.string().optional().describe('incoming or outgoing'),
      createdAt: z.string().describe('Message creation timestamp')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique message ID'),
      conversationId: z.string().describe('Conversation the message belongs to'),
      userId: z.string().optional().describe('User who sent the message'),
      messageType: z.string().optional().describe('Message type (text, image, etc.)'),
      payload: z.record(z.string(), z.unknown()).describe('Message content and payload'),
      direction: z.string().optional().describe('incoming or outgoing'),
      createdAt: z.string().describe('Message creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let botId = ctx.config.botId;
      if (!botId) return { inputs: [], updatedState: ctx.state };

      let client = new RuntimeClient({ token: ctx.auth.token, botId });

      let lastSeenId = ctx.state?.lastSeenId as string | undefined;
      let result = await client.listMessages();
      let messages = (result.messages || []) as Record<string, unknown>[];

      let newMessages = lastSeenId
        ? messages.filter(
            m =>
              m.id !== lastSeenId &&
              new Date(m.createdAt as string) >
                new Date((ctx.state?.lastSeenAt as string) || '1970-01-01')
          )
        : messages;

      let inputs = newMessages.map(m => ({
        messageId: m.id as string,
        conversationId: m.conversationId as string,
        userId: m.userId as string | undefined,
        messageType: m.type as string | undefined,
        payload: (m.payload || {}) as Record<string, unknown>,
        direction: m.direction as string | undefined,
        createdAt: m.createdAt as string
      }));

      let latestMessage = messages[0];
      return {
        inputs,
        updatedState: {
          lastSeenId: latestMessage ? latestMessage.id : lastSeenId,
          lastSeenAt: latestMessage ? latestMessage.createdAt : ctx.state?.lastSeenAt
        }
      };
    },
    handleEvent: async ctx => {
      let direction = ctx.input.direction || 'unknown';
      return {
        type: `message.${direction}`,
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          conversationId: ctx.input.conversationId,
          userId: ctx.input.userId,
          messageType: ctx.input.messageType,
          payload: ctx.input.payload,
          direction: ctx.input.direction,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
