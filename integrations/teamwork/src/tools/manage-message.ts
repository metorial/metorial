import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageMessage = SlateTool.create(spec, {
  name: 'Manage Message',
  key: 'manage_message',
  description: `Create, update, or delete a message (discussion post) in a Teamwork project. Messages support titles, body content, categories, and tags.`,
  instructions: [
    'For "create", provide projectId, title, and body.',
    'For "update" and "delete", provide the messageId.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The action to perform'),
      messageId: z.string().optional().describe('Message ID (required for update/delete)'),
      projectId: z.string().optional().describe('Project ID (required for create)'),
      title: z.string().optional().describe('Message title'),
      body: z.string().optional().describe('Message body (HTML supported)'),
      categoryId: z.string().optional().describe('Message category ID'),
      tags: z.string().optional().describe('Comma-separated tags')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('ID of the message'),
      title: z.string().optional().describe('Message title'),
      created: z.boolean().optional().describe('Whether the message was created'),
      updated: z.boolean().optional().describe('Whether the message was updated'),
      deleted: z.boolean().optional().describe('Whether the message was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.projectId) throw new Error('projectId is required to create a message');
      if (!ctx.input.title) throw new Error('title is required to create a message');
      if (!ctx.input.body) throw new Error('body is required to create a message');
      let result = await client.createMessage(ctx.input.projectId, {
        title: ctx.input.title,
        body: ctx.input.body,
        categoryId: ctx.input.categoryId,
        tags: ctx.input.tags
      });
      let messageId = result.messageId || result.id;
      return {
        output: {
          messageId: messageId ? String(messageId) : undefined,
          title: ctx.input.title,
          created: true
        },
        message: `Created message **${ctx.input.title}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.messageId) throw new Error('messageId is required to update a message');
      await client.updateMessage(ctx.input.messageId, {
        title: ctx.input.title,
        body: ctx.input.body,
        categoryId: ctx.input.categoryId,
        tags: ctx.input.tags
      });
      return {
        output: { messageId: ctx.input.messageId, title: ctx.input.title, updated: true },
        message: `Updated message **${ctx.input.messageId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.messageId) throw new Error('messageId is required to delete a message');
      await client.deleteMessage(ctx.input.messageId);
      return {
        output: { messageId: ctx.input.messageId, deleted: true },
        message: `Deleted message **${ctx.input.messageId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
