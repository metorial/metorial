import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageChannel = SlateTool.create(spec, {
  name: 'Manage Channel',
  key: 'manage_channel',
  description: `Create, update, or delete a feedback channel in Dovetail. Channels organize feedback streams from sources like support tickets, app reviews, NPS feedback, etc. Also supports managing topics within channels and adding data points.`,
  instructions: [
    'To create a channel, provide a title and contentType (APP_REVIEW, CHURN_REASONS, NPS_FEEDBACK, PRODUCT_REVIEW, or SUPPORT_TICKETS).',
    'To update a channel, provide the channelId and a new title.',
    'To delete a channel, provide the channelId and set action to "delete".',
    'To manage topics or add data points, use the dedicated topic/data point tools.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      channelId: z.string().optional().describe('Channel ID (required for update and delete)'),
      title: z.string().optional().describe('Channel title (max 200 characters)'),
      contentType: z
        .enum([
          'APP_REVIEW',
          'CHURN_REASONS',
          'NPS_FEEDBACK',
          'PRODUCT_REVIEW',
          'SUPPORT_TICKETS'
        ])
        .optional()
        .describe('Type of content for the channel (required for create)'),
      context: z
        .string()
        .optional()
        .describe('Additional context for the channel (max 10,000 characters, update only)'),
      folderId: z
        .string()
        .optional()
        .describe('Folder ID to place the channel in (create only)')
    })
  )
  .output(
    z.object({
      channelId: z.string(),
      title: z.string().optional(),
      createdAt: z.string().optional(),
      deleted: z.boolean().optional(),
      topics: z
        .array(
          z.object({
            topicId: z.string(),
            title: z.string(),
            description: z.string()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.title || !ctx.input.contentType) {
        throw new Error('title and contentType are required for create action');
      }
      let channel = await client.createChannel({
        title: ctx.input.title,
        contentType: ctx.input.contentType,
        folderId: ctx.input.folderId
      });
      return {
        output: {
          channelId: channel.id,
          title: channel.title,
          createdAt: channel.created_at,
          topics: (channel.topics || []).map(t => ({
            topicId: t.id,
            title: t.title,
            description: t.description
          }))
        },
        message: `Created channel **${channel.title}** (ID: ${channel.id}) with ${(channel.topics || []).length} default topics.`
      };
    }

    if (!ctx.input.channelId) {
      throw new Error('channelId is required for update and delete actions');
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.title) {
        throw new Error('title is required for update action');
      }
      let channel = await client.updateChannel(ctx.input.channelId, {
        title: ctx.input.title,
        context: ctx.input.context
      });
      return {
        output: {
          channelId: channel.id,
          title: channel.title
        },
        message: `Updated channel **${channel.title}**.`
      };
    }

    // delete
    let result = await client.deleteChannel(ctx.input.channelId);
    return {
      output: {
        channelId: result.id,
        title: result.title,
        deleted: true
      },
      message: `Deleted channel **${result.title || ctx.input.channelId}**. It can be restored from trash within 30 days.`
    };
  })
  .build();
