import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import * as map from '../lib/mappers';
import {
  field,
  invalid,
  malformed,
  numericId,
  object,
  records,
  required
} from '../lib/validation';
import { spec } from '../spec';

export let manageEventTopicTool = SlateTool.create(spec, {
  name: 'Manage Event Topic',
  key: 'manage_event_topic',
  description: `Create, update, list, or delete event stream topics. Topics are channels for pub/sub messaging between recipes and external systems. Also supports publishing and consuming messages.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'update', 'delete', 'publish', 'consume'])
        .describe('Action to perform'),
      folderId: z
        .number()
        .optional()
        .describe(
          'Folder/project for a new topic; omission may create the default Event Streams project.'
        ),
      topicId: z
        .string()
        .optional()
        .describe('Topic ID (required for get/update/delete/publish/consume)'),
      name: z.string().optional().describe('Topic name (for list filter or create/update)'),
      description: z.string().optional().describe('Topic description (for create/update)'),
      retentionSeconds: z
        .number()
        .optional()
        .describe('Message retention period in seconds (default 604800 = 7 days)'),
      schema: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Topic message schema (for create)'),
      message: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Message payload to publish'),
      afterMessageId: z.string().optional().describe('Consume messages after this message ID'),
      sinceTime: z
        .string()
        .optional()
        .describe('Consume messages since this ISO 8601 timestamp'),
      batchSize: z.number().optional().describe('Number of messages to consume (max 50)')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether the operation succeeded'),
      topics: z
        .array(
          z.object({
            topicId: z.number().optional().describe('Topic ID'),
            name: z.string().optional().describe('Topic name'),
            description: z.string().nullable().optional().describe('Topic description'),
            folderId: z.number().nullable().optional().describe('Native folder ID'),
            retention: z
              .number()
              .nullable()
              .optional()
              .describe('Retention period in seconds'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of topics'),
      topic: z
        .object({
          topicId: z.number().optional().describe('Topic ID'),
          name: z.string().optional().describe('Topic name'),
          description: z.string().nullable().optional().describe('Topic description'),
          retention: z.number().nullable().optional().describe('Retention period in seconds')
        })
        .optional()
        .describe('Single topic details'),
      messageId: z.string().optional().describe('Published message ID'),
      messages: z
        .array(
          z.object({
            messageId: z.string().optional().describe('Message ID'),
            time: z.string().optional().describe('Message timestamp'),
            content: z.record(z.string(), z.unknown()).describe('Message payload')
          })
        )
        .optional()
        .describe('Consumed messages')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const { action, topicId, name, description, retentionSeconds, schema } = ctx.input;
    if (action === 'list') {
      const result = await client.listTopics({ name });
      const topics = records(result.items).map(map.topic);
      return {
        output: { success: true, topics },
        message: `Returned ${topics.length} topics.`
      };
    }
    if (action === 'create') {
      const result = await client.createTopic({
        name: required(name, 'Topic name'),
        description,
        retention: retentionSeconds,
        schema,
        folderId: ctx.input.folderId
      });
      return {
        output: { success: true, topic: map.topic(result) },
        message:
          'Created topic. Omitting a folder can create a retained Event Streams project.'
      };
    }
    const id = numericId(topicId, 'topicId');
    if (action === 'get') {
      const topic = map.topic(await client.getTopic(id));
      if (String(topic.topicId) !== id) malformed();
      return { output: { success: true, topic }, message: 'Retrieved topic.' };
    }
    if (action === 'update') {
      const topic = map.topic(
        await client.updateTopic(id, { name, description, retention: retentionSeconds })
      );
      if (String(topic.topicId) !== id) malformed();
      return { output: { success: true, topic }, message: 'Updated topic.' };
    }
    if (action === 'delete') {
      await client.deleteTopic(id);
      return {
        output: { success: true },
        message:
          'Deleted topic and its retained messages. This does not undo downstream processing.'
      };
    }
    if (action === 'publish') {
      if (!ctx.input.message) invalid('Message is required.');
      const result = await client.publishMessage(id, ctx.input.message);
      return {
        output: { success: true, messageId: field(result, 'message_id', z.string().min(1)) },
        message:
          'Published message; downstream effects cannot be reversed by deleting the topic.'
      };
    }
    const result = await client.consumeMessages(id, ctx.input);
    const messages = records(result.messages).map(m => ({
      messageId: field(m, 'message_id', z.string()),
      time: field(m, 'time', z.string()),
      content: object(m.payload)
    }));
    return {
      output: { success: true, messages },
      message: `Returned ${messages.length} messages; batch size is a maximum, not a completeness guarantee.`
    };
  });
