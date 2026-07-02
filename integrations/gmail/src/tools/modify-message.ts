import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

export let modifyMessage = SlateTool.create(spec, {
  name: 'Modify Message',
  key: 'modify_message',
  description: `Modify a message's labels, move it to trash, or restore it from trash. Supports both single and batch operations on multiple messages.`,
  instructions: [
    'Use **action** "modify_labels" to add/remove labels (e.g., mark as read by removing UNREAD, star by adding STARRED).',
    'Use **action** "trash" or "untrash" to manage trash status.',
    'For batch label modifications, provide multiple **messageIds**. Batch only works with "modify_labels" action.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(gmailActionScopes.modifyMessage)
  .input(
    z.object({
      messageIds: z.array(z.string()).describe('One or more message IDs to modify.'),
      action: z
        .enum(['modify_labels', 'trash', 'untrash'])
        .describe('Action to perform on the message(s).'),
      addLabelIds: z
        .array(z.string())
        .optional()
        .describe('Label IDs to add (for modify_labels action).'),
      removeLabelIds: z
        .array(z.string())
        .optional()
        .describe('Label IDs to remove (for modify_labels action).')
    })
  )
  .output(
    z.object({
      modifiedCount: z.number().describe('Number of messages modified.'),
      messageIds: z.array(z.string()).describe('IDs of modified messages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    let { messageIds, action, addLabelIds, removeLabelIds } = ctx.input;

    if (action === 'modify_labels') {
      if (messageIds.length > 1) {
        await client.batchModifyMessages(messageIds, addLabelIds, removeLabelIds);
      } else {
        await client.modifyMessage(messageIds[0]!, addLabelIds, removeLabelIds);
      }
    } else if (action === 'trash') {
      for (let id of messageIds) {
        await client.trashMessage(id);
      }
    } else if (action === 'untrash') {
      for (let id of messageIds) {
        await client.untrashMessage(id);
      }
    }

    let actionLabel =
      action === 'modify_labels'
        ? 'Modified labels on'
        : action === 'trash'
          ? 'Trashed'
          : 'Untrashed';

    return {
      output: {
        modifiedCount: messageIds.length,
        messageIds
      },
      message: `${actionLabel} **${messageIds.length}** message(s).`
    };
  });
