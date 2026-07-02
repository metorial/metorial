import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { frontServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateConversation = SlateTool.create(spec, {
  name: 'Update Conversation',
  key: 'update_conversation',
  description: `Update a conversation's properties including status, assignee, tags, followers, links, reminders, description, custom fields, and inbox. Supports assigning/unassigning teammates, archiving, reopening, trashing, restoring, adding/removing tags and links, and managing followers — all in a single flexible operation.`,
  instructions: [
    'To unassign a conversation, set assigneeId to an empty string; the tool sends null to Front as required by the current API.',
    'Use addTagIds/removeTagIds to manage tags without replacing existing ones.',
    'Use addLinkIds/removeLinkIds or addLinkExternalUrls to manage conversation links.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to update'),
      status: z
        .enum(['archived', 'open', 'deleted', 'spam'])
        .optional()
        .describe('New status for the conversation'),
      statusId: z
        .string()
        .optional()
        .describe(
          'Ticketing status ID to set. Do not provide with status. Requires Front ticketing.'
        ),
      assigneeId: z
        .string()
        .optional()
        .describe('Teammate ID to assign to, or empty string to unassign'),
      inboxId: z.string().optional().describe('Inbox ID to move the conversation to'),
      description: z
        .string()
        .optional()
        .describe('Task conversation description to set. Only allowed on task conversations.'),
      clearDescription: z
        .boolean()
        .optional()
        .describe(
          'Set true to clear the task conversation description. Do not provide with description.'
        ),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Complete custom field object for this conversation. Front replaces the full custom field set.'
        ),
      addTagIds: z.array(z.string()).optional().describe('Tag IDs to add to the conversation'),
      removeTagIds: z
        .array(z.string())
        .optional()
        .describe('Tag IDs to remove from the conversation'),
      addLinkIds: z
        .array(z.string())
        .max(10)
        .optional()
        .describe(
          'Link IDs to add to the conversation. Do not provide with addLinkExternalUrls.'
        ),
      addLinkExternalUrls: z
        .array(z.string())
        .max(10)
        .optional()
        .describe(
          'External URLs to attach to the conversation. Front creates links as needed. Do not provide with addLinkIds.'
        ),
      removeLinkIds: z
        .array(z.string())
        .max(10)
        .optional()
        .describe('Link IDs to remove from the conversation'),
      addFollowerIds: z
        .array(z.string())
        .optional()
        .describe('Teammate IDs to add as followers'),
      removeFollowerIds: z
        .array(z.string())
        .optional()
        .describe('Teammate IDs to remove as followers'),
      reminderTeammateId: z
        .string()
        .optional()
        .describe('Teammate ID or email alias to snooze or unsnooze for'),
      reminderScheduledAt: z
        .number()
        .optional()
        .describe('Unix timestamp in seconds for the reminder. Must be in the future.'),
      clearReminder: z
        .boolean()
        .optional()
        .describe('Set true with reminderTeammateId to unsnooze/cancel the reminder.'),
      reminderStatusId: z
        .string()
        .optional()
        .describe('Optional waiting status ID for the reminder. Requires Front ticketing.')
    })
  )
  .output(
    z.object({
      conversationId: z.string(),
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;
    let actions: string[] = [];

    if (input.status && input.statusId) {
      throw frontServiceError('Provide either status or statusId, not both.');
    }

    if (input.description !== undefined && input.clearDescription) {
      throw frontServiceError('Provide either description or clearDescription, not both.');
    }

    if (input.addLinkIds?.length && input.addLinkExternalUrls?.length) {
      throw frontServiceError('Provide either addLinkIds or addLinkExternalUrls, not both.');
    }

    if (
      (input.reminderScheduledAt !== undefined ||
        input.clearReminder ||
        input.reminderStatusId) &&
      !input.reminderTeammateId
    ) {
      throw frontServiceError(
        'reminderTeammateId is required when updating conversation reminders.'
      );
    }

    if (input.reminderScheduledAt !== undefined && input.clearReminder) {
      throw frontServiceError(
        'Provide either reminderScheduledAt or clearReminder, not both.'
      );
    }

    if (
      input.reminderTeammateId &&
      input.reminderScheduledAt === undefined &&
      !input.clearReminder
    ) {
      throw frontServiceError('reminderScheduledAt is required unless clearReminder is true.');
    }

    let updateData: Record<string, any> = {};
    if (input.status !== undefined) {
      updateData.status = input.status;
      actions.push(`status → ${input.status}`);
    }
    if (input.statusId !== undefined) {
      updateData.status_id = input.statusId;
      actions.push(`ticket status updated`);
    }
    if (input.inboxId !== undefined) {
      updateData.inbox_id = input.inboxId;
      actions.push(`moved to inbox`);
    }
    if (input.description !== undefined || input.clearDescription) {
      updateData.description = input.clearDescription ? null : input.description;
      actions.push(input.clearDescription ? `description cleared` : `description updated`);
    }
    if (input.customFields !== undefined) {
      updateData.custom_fields = input.customFields;
      actions.push(`custom fields updated`);
    }

    if (Object.keys(updateData).length > 0) {
      await client.updateConversation(input.conversationId, updateData);
    }

    if (input.assigneeId !== undefined) {
      await client.updateConversationAssignee(
        input.conversationId,
        input.assigneeId === '' ? null : input.assigneeId
      );
      actions.push(input.assigneeId ? `assigned to ${input.assigneeId}` : `unassigned`);
    }

    if (input.addTagIds && input.addTagIds.length > 0) {
      for (let tagId of input.addTagIds) {
        await client.addConversationTag(input.conversationId, tagId);
      }
      actions.push(`added ${input.addTagIds.length} tag(s)`);
    }

    if (input.removeTagIds && input.removeTagIds.length > 0) {
      for (let tagId of input.removeTagIds) {
        await client.removeConversationTag(input.conversationId, tagId);
      }
      actions.push(`removed ${input.removeTagIds.length} tag(s)`);
    }

    if (input.addLinkIds?.length || input.addLinkExternalUrls?.length) {
      await client.addConversationLinks(input.conversationId, {
        link_ids: input.addLinkIds,
        link_external_urls: input.addLinkExternalUrls
      });
      actions.push(
        `added ${(input.addLinkIds?.length ?? 0) + (input.addLinkExternalUrls?.length ?? 0)} link(s)`
      );
    }

    if (input.removeLinkIds && input.removeLinkIds.length > 0) {
      await client.removeConversationLinks(input.conversationId, input.removeLinkIds);
      actions.push(`removed ${input.removeLinkIds.length} link(s)`);
    }

    if (input.addFollowerIds && input.addFollowerIds.length > 0) {
      await client.addConversationFollowers(input.conversationId, input.addFollowerIds);
      actions.push(`added ${input.addFollowerIds.length} follower(s)`);
    }

    if (input.removeFollowerIds && input.removeFollowerIds.length > 0) {
      await client.removeConversationFollowers(input.conversationId, input.removeFollowerIds);
      actions.push(`removed ${input.removeFollowerIds.length} follower(s)`);
    }

    if (input.reminderTeammateId) {
      await client.updateConversationReminders(input.conversationId, {
        teammate_id: input.reminderTeammateId,
        scheduled_at: input.clearReminder ? null : input.reminderScheduledAt!,
        status_id: input.reminderStatusId
      });
      actions.push(input.clearReminder ? `reminder cleared` : `reminder updated`);
    }

    return {
      output: {
        conversationId: input.conversationId,
        updated: actions.length > 0
      },
      message:
        actions.length > 0
          ? `Updated conversation ${input.conversationId}: ${actions.join(', ')}.`
          : `No changes made to conversation ${input.conversationId}.`
    };
  });
