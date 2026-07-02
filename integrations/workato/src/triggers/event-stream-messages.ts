import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let eventStreamMessagesTrigger = SlateTrigger.create(spec, {
  name: 'Event Stream Messages',
  key: 'event_stream_messages',
  description:
    'Triggers when new messages are published to a Workato Event Stream topic. Consumes messages from the specified topic using cursor-based polling.'
})
  .input(
    z.object({
      messageId: z.string().describe('Message ID'),
      time: z.string().describe('Message timestamp'),
      topicId: z.string().describe('Topic ID'),
      content: z.record(z.string(), z.unknown()).describe('Message payload')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique message ID'),
      topicId: z.string().describe('Topic ID the message belongs to'),
      time: z.string().describe('Message timestamp'),
      content: z.record(z.string(), z.unknown()).describe('Message payload/content')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);
      let state = ctx.state as { topicCursors?: Record<string, string> } | undefined;
      let topicCursors = state?.topicCursors ?? {};

      // Get all topics
      let topicsResult = await client.listTopics();
      let topics = topicsResult.data ?? (Array.isArray(topicsResult) ? topicsResult : []);

      let allMessages: Array<{
        messageId: string;
        time: string;
        topicId: string;
        content: Record<string, unknown>;
      }> = [];
      let newCursors = { ...topicCursors };

      // Poll each topic for new messages
      for (let topic of topics.slice(0, 10)) {
        let topicId = String(topic.id);
        let cursor = topicCursors[topicId];
        try {
          let result = await client.consumeMessages(topicId, {
            afterMessageId: cursor,
            batchSize: 50
          });
          let messages = result.messages ?? [];
          for (let msg of messages) {
            allMessages.push({
              messageId: msg.message_id,
              time: msg.time,
              topicId,
              content: msg.payload ?? {}
            });
            newCursors[topicId] = msg.message_id;
          }
        } catch {
          // Skip topics where consumption fails
        }
      }

      return {
        inputs: allMessages,
        updatedState: {
          topicCursors: newCursors
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'event_stream.message',
        id: `msg-${ctx.input.topicId}-${ctx.input.messageId}`,
        output: {
          messageId: ctx.input.messageId,
          topicId: ctx.input.topicId,
          time: ctx.input.time,
          content: ctx.input.content
        }
      };
    }
  });
