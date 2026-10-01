import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { Client } from '../lib/client';

export let updateEmail = SlateTool.create(spec, {
  name: 'Mail Update Email',
  key: 'mail_update_email',
  description: `Perform actions on one or more emails: mark as read/unread, flag/unflag, move to a folder, add/remove labels, archive, mark as spam, or delete. Supports batch operations on multiple message IDs.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Zoho Mail account ID'),
      messageIds: z.array(z.string()).min(1).describe('One or more message IDs to update'),
      action: z
        .enum([
          'markAsRead',
          'markAsUnread',
          'flag',
          'unflag',
          'moveToFolder',
          'addLabel',
          'removeLabel',
          'archive',
          'unarchive',
          'markAsSpam',
          'markAsNotSpam',
          'delete'
        ])
        .describe('Action to perform on the message(s)'),
      destinationFolderId: z
        .string()
        .optional()
        .describe('Target folder ID (required for moveToFolder action)'),
      labelId: z
        .string()
        .optional()
        .describe('Label ID (required for addLabel/removeLabel actions)'),
      folderId: z
        .string()
        .optional()
        .describe('Source folder ID (required for delete action)'),
      flagValue: z.number().optional().describe('Flag color value 0-9 (for flag action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      messagesAffected: z.number().describe('Number of messages affected')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.auth.region
    });

    let { action, messageIds, accountId } = ctx.input;

    if (action === 'delete') {
      if (!ctx.input.folderId) {
        throw createApiServiceError('folderId is required for delete action');
      }
      for (let msgId of messageIds) {
        await client.deleteMessage(accountId, ctx.input.folderId, msgId);
      }
      return {
        output: { success: true, messagesAffected: messageIds.length },
        message: `Deleted **${messageIds.length}** email(s).`
      };
    }

    let modeMap: Record<string, string> = {
      markAsRead: 'markAsRead',
      markAsUnread: 'markAsUnread',
      flag: 'setFlag',
      unflag: 'setFlag',
      moveToFolder: 'moveMessage',
      addLabel: 'applyLabel',
      removeLabel: 'removeLabel',
      archive: 'archiveMails',
      unarchive: 'unArchiveMails',
      markAsSpam: 'moveToSpam',
      markAsNotSpam: 'markNotSpam'
    };

    let params: any = {
      mode: modeMap[action],
      messageId: messageIds
    };

    if (action === 'moveToFolder') {
      if (!ctx.input.destinationFolderId) {
        throw createApiServiceError('destinationFolderId is required for moveToFolder action');
      }
      params.destfolderId = ctx.input.destinationFolderId;
    }

    if (action === 'addLabel' || action === 'removeLabel') {
      if (!ctx.input.labelId) {
        throw createApiServiceError('labelId is required for addLabel/removeLabel actions');
      }
      params.labelId = [ctx.input.labelId];
    }

    if (action === 'unflag') params.flagid = 'flag_not_set';
    if (action === 'flag') params.flagid = 'important';
    if (action === 'flag' && ctx.input.flagValue !== undefined) {
      params.flagid =
        ['flag_not_set', 'info', 'important', 'followup'][ctx.input.flagValue] || 'important';
    }

    await client.updateMessage(accountId, params);

    let actionDescriptions: Record<string, string> = {
      markAsRead: 'marked as read',
      markAsUnread: 'marked as unread',
      flag: 'flagged',
      unflag: 'unflagged',
      moveToFolder: `moved to folder ${ctx.input.destinationFolderId}`,
      addLabel: `labeled with ${ctx.input.labelId}`,
      removeLabel: `label ${ctx.input.labelId} removed`,
      archive: 'archived',
      unarchive: 'unarchived',
      markAsSpam: 'marked as spam',
      markAsNotSpam: 'marked as not spam'
    };

    return {
      output: { success: true, messagesAffected: messageIds.length },
      message: `**${messageIds.length}** email(s) ${actionDescriptions[action]}.`
    };
  })
  .build();
