import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTopic = SlateTool.create(spec, {
  name: 'Manage Topic',
  key: 'manage_topic',
  description: `Create, update, or delete a topic within a feedback channel. Topics define categories for classifying feedback data points within a channel.`,
  instructions: [
    'To create a topic, provide channelId, title, and description.',
    'To update, provide topicId and the fields to change.',
    'To delete, provide topicId and set action to "delete".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      topicId: z.string().optional().describe('Topic ID (required for update and delete)'),
      channelId: z.string().optional().describe('Channel ID (required for create)'),
      title: z.string().optional().describe('Topic title (1-300 characters)'),
      description: z.string().optional().describe('Topic description (1-2500 characters)')
    })
  )
  .output(
    z.object({
      topicId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      channelId: z.string().optional(),
      createdAt: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.channelId || !ctx.input.title || !ctx.input.description) {
        throw new Error('channelId, title, and description are required for create action');
      }
      let topic = await client.createTopic({
        channelId: ctx.input.channelId,
        title: ctx.input.title,
        description: ctx.input.description
      });
      return {
        output: {
          topicId: topic.id,
          title: topic.title,
          description: topic.description,
          channelId: topic.channel?.id,
          createdAt: topic.created_at
        },
        message: `Created topic **${topic.title}** in channel ${topic.channel?.id || ctx.input.channelId}.`
      };
    }

    if (!ctx.input.topicId) {
      throw new Error('topicId is required for update and delete actions');
    }

    if (ctx.input.action === 'update') {
      let topic = await client.updateTopic(ctx.input.topicId, {
        title: ctx.input.title,
        description: ctx.input.description
      });
      return {
        output: {
          topicId: topic.id,
          title: topic.title,
          description: topic.description
        },
        message: `Updated topic **${topic.title || ctx.input.topicId}**.`
      };
    }

    // delete
    await client.deleteTopic(ctx.input.topicId);
    return {
      output: {
        topicId: ctx.input.topicId,
        deleted: true
      },
      message: `Deleted topic **${ctx.input.topicId}**. It can be restored from trash within 30 days.`
    };
  })
  .build();
