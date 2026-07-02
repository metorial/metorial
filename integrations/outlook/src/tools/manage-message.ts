import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  emailAddress: z.object({
    name: z.string().optional(),
    address: z.string()
  })
});

export let manageMessage = SlateTool.create(spec, {
  name: 'Manage Email',
  key: 'manage_message',
  description: `Perform actions on an existing email message: reply, reply all, forward, move to a folder, update properties (read status, importance, categories, flag), or delete. Use the **action** field to specify the operation.`,
  instructions: [
    'Only one action can be performed per invocation.',
    'For **move**, provide the destination folder ID or well-known name.',
    'For **reply** or **replyAll**, provide a comment to include in the reply.',
    'For **forward**, provide the recipients and optionally a comment.',
    'For **update**, provide the fields to update (isRead, importance, categories, flag).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messageId: z.string().describe('The ID of the message to act on'),
      action: z
        .enum(['reply', 'replyAll', 'forward', 'move', 'update', 'delete'])
        .describe('The action to perform'),
      comment: z
        .string()
        .optional()
        .describe('Comment for reply, replyAll, or forward actions'),
      forwardTo: z.array(recipientSchema).optional().describe('Recipients for forward action'),
      destinationFolderId: z
        .string()
        .optional()
        .describe('Destination folder ID or well-known name for move action'),
      isRead: z
        .boolean()
        .optional()
        .describe('Mark message as read/unread (for update action)'),
      importance: z
        .enum(['low', 'normal', 'high'])
        .optional()
        .describe('Set importance level (for update action)'),
      categories: z
        .array(z.string())
        .optional()
        .describe('Set categories (for update action)'),
      flagStatus: z
        .enum(['notFlagged', 'complete', 'flagged'])
        .optional()
        .describe('Set flag status (for update action)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      messageId: z
        .string()
        .optional()
        .describe('ID of the message after the action (may change on move)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { messageId, action } = ctx.input;

    switch (action) {
      case 'reply': {
        await client.replyToMessage(messageId, ctx.input.comment || '', false);
        return {
          output: { success: true, messageId },
          message: `Replied to message **${messageId}**.`
        };
      }
      case 'replyAll': {
        await client.replyToMessage(messageId, ctx.input.comment || '', true);
        return {
          output: { success: true, messageId },
          message: `Replied all to message **${messageId}**.`
        };
      }
      case 'forward': {
        if (!ctx.input.forwardTo?.length) {
          throw new Error('forwardTo recipients are required for forward action');
        }
        await client.forwardMessage(messageId, ctx.input.forwardTo, ctx.input.comment);
        return {
          output: { success: true, messageId },
          message: `Forwarded message **${messageId}** to ${ctx.input.forwardTo.map(r => r.emailAddress.address).join(', ')}.`
        };
      }
      case 'move': {
        if (!ctx.input.destinationFolderId) {
          throw new Error('destinationFolderId is required for move action');
        }
        let moved = await client.moveMessage(messageId, ctx.input.destinationFolderId);
        return {
          output: { success: true, messageId: moved.id },
          message: `Moved message to folder **${ctx.input.destinationFolderId}**.`
        };
      }
      case 'update': {
        let updates: Record<string, any> = {};
        if (ctx.input.isRead !== undefined) updates.isRead = ctx.input.isRead;
        if (ctx.input.importance) updates.importance = ctx.input.importance;
        if (ctx.input.categories) updates.categories = ctx.input.categories;
        if (ctx.input.flagStatus) updates.flag = { flagStatus: ctx.input.flagStatus };

        let updated = await client.updateMessage(messageId, updates);
        return {
          output: { success: true, messageId: updated.id },
          message: `Updated message **${messageId}** properties.`
        };
      }
      case 'delete': {
        await client.deleteMessage(messageId);
        return {
          output: { success: true, messageId },
          message: `Deleted message **${messageId}**.`
        };
      }
    }
  })
  .build();
