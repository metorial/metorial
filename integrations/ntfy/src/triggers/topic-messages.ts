import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let topicMessages = SlateTrigger.create(spec, {
  name: 'Topic Messages',
  key: 'topic_messages',
  description:
    'Triggers when new messages are published to the configured ntfy topic. Polls for new messages and emits each one as a separate event. Configure the topic in the integration settings.'
})
  .input(
    z.object({
      messageId: z.string().describe('Unique ID of the message'),
      time: z.number().describe('Unix timestamp when the message was published'),
      topic: z.string().describe('Topic the message was published to'),
      title: z.string().optional().describe('Notification title'),
      message: z.string().optional().describe('Notification message body'),
      priority: z.number().optional().describe('Priority level (1-5)'),
      tags: z.array(z.string()).optional().describe('Tags assigned to the message'),
      clickUrl: z.string().optional().describe('Click action URL'),
      iconUrl: z.string().optional().describe('Notification icon URL'),
      expires: z.number().optional().describe('Unix timestamp when the message expires')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique ID of the message'),
      time: z.number().describe('Unix timestamp when the message was published'),
      topic: z.string().describe('Topic the message was published to'),
      title: z.string().optional().describe('Notification title'),
      message: z.string().optional().describe('Notification message body'),
      priority: z.number().optional().describe('Priority level (1-5)'),
      tags: z.array(z.string()).optional().describe('Tags assigned to the message'),
      clickUrl: z.string().optional().describe('Click action URL'),
      iconUrl: z.string().optional().describe('Notification icon URL'),
      expires: z.number().optional().describe('Unix timestamp when the message expires')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let topic = ctx.config.topic;
      if (!topic) {
        return { inputs: [], updatedState: ctx.state };
      }

      let client = new Client({
        serverUrl: ctx.config.serverUrl,
        auth: ctx.auth
      });

      let lastMessageId = ctx.state?.lastMessageId as string | undefined;

      let messages = await client.pollMessages({
        topic,
        since: lastMessageId || 'all'
      });

      // Sort by time ascending so we process oldest first
      messages.sort((a, b) => a.time - b.time);

      let newLastMessageId = lastMessageId;
      if (messages.length > 0) {
        newLastMessageId = messages[messages.length - 1]!.messageId;
      }

      return {
        inputs: messages.map(m => ({
          messageId: m.messageId,
          time: m.time,
          topic: m.topic,
          title: m.title,
          message: m.message,
          priority: m.priority,
          tags: m.tags,
          clickUrl: m.clickUrl,
          iconUrl: m.iconUrl,
          expires: m.expires
        })),
        updatedState: {
          lastMessageId: newLastMessageId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'message.published',
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          time: ctx.input.time,
          topic: ctx.input.topic,
          title: ctx.input.title,
          message: ctx.input.message,
          priority: ctx.input.priority,
          tags: ctx.input.tags,
          clickUrl: ctx.input.clickUrl,
          iconUrl: ctx.input.iconUrl,
          expires: ctx.input.expires
        }
      };
    }
  })
  .build();
