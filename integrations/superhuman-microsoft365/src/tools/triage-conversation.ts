import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let triageConversation = SlateTool.create(spec, {
  name: 'Triage Conversation',
  key: 'triage_conversation',
  description:
    'Apply a single triage **action** to **every message** in a conversation (same `conversationId`). Supports archive, move folder, read/unread, flag/unflag, replace categories, and delete—aligned with fast inbox workflows.',
  instructions: [
    '**archive** moves each message to the well-known **archive** folder.',
    '**move** requires **destinationFolderId** (folder id or well-known name such as `inbox` or `junkemail`).',
    '**categorize** replaces the full category set on each message with **categories** (Graph stores an array).',
    'Large threads trigger many Graph calls; consider scope before running destructive actions.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('Thread id (`conversationId`) to triage'),
      action: z
        .enum([
          'archive',
          'move',
          'mark_read',
          'mark_unread',
          'flag',
          'unflag',
          'categorize',
          'delete'
        ])
        .describe('Operation applied to each message in the thread'),
      destinationFolderId: z
        .string()
        .optional()
        .describe('Required for **move**: destination folder id or well-known name'),
      categories: z
        .array(z.string())
        .optional()
        .describe('Required for **categorize**: replacement category list on each message')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      messagesAffected: z.number(),
      action: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { conversationId, action } = ctx.input;

    let threadMessages = await client.listMessagesByConversation(conversationId, {
      select: ['id'],
      orderby: 'receivedDateTime asc'
    });

    if (!threadMessages.length) {
      return {
        output: { success: true, messagesAffected: 0, action },
        message: `No messages found for conversation **${conversationId}**.`
      };
    }

    let ids = threadMessages.map(m => m.id);

    switch (action) {
      case 'archive': {
        for (let id of ids) {
          await client.moveMessage(id, 'archive');
        }
        break;
      }
      case 'move': {
        if (!ctx.input.destinationFolderId) {
          throw new Error('destinationFolderId is required for move');
        }
        for (let id of ids) {
          await client.moveMessage(id, ctx.input.destinationFolderId);
        }
        break;
      }
      case 'mark_read': {
        for (let id of ids) {
          await client.updateMessage(id, { isRead: true });
        }
        break;
      }
      case 'mark_unread': {
        for (let id of ids) {
          await client.updateMessage(id, { isRead: false });
        }
        break;
      }
      case 'flag': {
        for (let id of ids) {
          await client.updateMessage(id, { flag: { flagStatus: 'flagged' } });
        }
        break;
      }
      case 'unflag': {
        for (let id of ids) {
          await client.updateMessage(id, { flag: { flagStatus: 'notFlagged' } });
        }
        break;
      }
      case 'categorize': {
        if (!ctx.input.categories) {
          throw new Error('categories is required for categorize');
        }
        for (let id of ids) {
          await client.updateMessage(id, { categories: ctx.input.categories });
        }
        break;
      }
      case 'delete': {
        for (let id of ids) {
          await client.deleteMessage(id);
        }
        break;
      }
    }

    return {
      output: {
        success: true,
        messagesAffected: ids.length,
        action
      },
      message: `Applied **${action}** to **${ids.length}** message(s) in the conversation.`
    };
  })
  .build();
