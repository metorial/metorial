import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
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
      success: z.boolean().describe('Whether the operation succeeded'),
      topics: z
        .array(
          z.object({
            topicId: z.number().describe('Topic ID'),
            name: z.string().describe('Topic name'),
            description: z.string().nullable().describe('Topic description'),
            retention: z.number().nullable().describe('Retention period in seconds'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of topics'),
      topic: z
        .object({
          topicId: z.number().describe('Topic ID'),
          name: z.string().describe('Topic name'),
          description: z.string().nullable().describe('Topic description'),
          retention: z.number().nullable().describe('Retention period in seconds')
        })
        .optional()
        .describe('Single topic details'),
      messageId: z.string().optional().describe('Published message ID'),
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Message ID'),
            time: z.string().describe('Message timestamp'),
            content: z.record(z.string(), z.unknown()).describe('Message payload')
          })
        )
        .optional()
        .describe('Consumed messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, topicId, name, description, retentionSeconds, schema } = ctx.input;

    if (action === 'list') {
      let result = await client.listTopics({ name });
      let items = result.data ?? (Array.isArray(result) ? result : []);
      let topics = items.map((t: any) => ({
        topicId: t.id,
        name: t.name,
        description: t.description ?? null,
        retention: t.retention ?? null,
        createdAt: t.created_at
      }));
      return {
        output: { success: true, topics },
        message: `Found **${topics.length}** event topics.`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('Name is required for create');
      let result = await client.createTopic({
        name,
        description,
        retention: retentionSeconds,
        schema
      });
      let created = result.data ?? result;
      return {
        output: {
          success: true,
          topic: {
            topicId: created.id,
            name: created.name,
            description: created.description ?? null,
            retention: created.retention ?? null
          }
        },
        message: `Created topic **${name}** with ID ${created.id}.`
      };
    }

    if (!topicId) throw new Error('Topic ID is required for this action');

    if (action === 'get') {
      let result = await client.getTopic(topicId);
      let t = result.data ?? result;
      return {
        output: {
          success: true,
          topic: {
            topicId: t.id,
            name: t.name,
            description: t.description ?? null,
            retention: t.retention ?? null
          }
        },
        message: `Topic **${t.name}** (ID: ${t.id}).`
      };
    }

    if (action === 'update') {
      await client.updateTopic(topicId, {
        name,
        description,
        retention: retentionSeconds
      });
      return {
        output: { success: true },
        message: `Updated topic **${topicId}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteTopic(topicId);
      return {
        output: { success: true },
        message: `Deleted topic **${topicId}**.`
      };
    }

    if (action === 'publish') {
      if (!ctx.input.message) throw new Error('Message payload is required for publish');
      let result = await client.publishMessage(topicId, ctx.input.message);
      return {
        output: { success: true, messageId: result.message_id },
        message: `Published message to topic ${topicId}. Message ID: **${result.message_id}**.`
      };
    }

    if (action === 'consume') {
      let result = await client.consumeMessages(topicId, {
        afterMessageId: ctx.input.afterMessageId,
        sinceTime: ctx.input.sinceTime,
        batchSize: ctx.input.batchSize
      });
      let messages = (result.messages ?? []).map((m: any) => ({
        messageId: m.message_id,
        time: m.time,
        content: m.payload ?? m
      }));
      return {
        output: { success: true, messages },
        message: `Consumed **${messages.length}** messages from topic ${topicId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
