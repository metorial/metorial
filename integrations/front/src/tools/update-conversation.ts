import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateConversation = SlateTool.create(spec, {
  name: 'Update Conversation',
  key: 'update_conversation',
  description: `Update a conversation's properties including status, assignee, tags, followers, and inbox. Supports assigning/unassigning teammates, archiving, reopening, trashing, restoring, adding/removing tags, and managing followers — all in a single flexible operation.`,
  instructions: [
    'To unassign a conversation, set assigneeId to an empty string.',
    'Use addTagIds/removeTagIds to manage tags without replacing existing ones.'
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
      assigneeId: z
        .string()
        .optional()
        .describe('Teammate ID to assign to, or empty string to unassign'),
      subject: z.string().optional().describe('New subject line'),
      inboxId: z.string().optional().describe('Inbox ID to move the conversation to'),
      addTagIds: z.array(z.string()).optional().describe('Tag IDs to add to the conversation'),
      removeTagIds: z
        .array(z.string())
        .optional()
        .describe('Tag IDs to remove from the conversation'),
      addFollowerIds: z
        .array(z.string())
        .optional()
        .describe('Teammate IDs to add as followers'),
      removeFollowerIds: z
        .array(z.string())
        .optional()
        .describe('Teammate IDs to remove as followers')
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

    let updateData: Record<string, any> = {};
    if (input.status !== undefined) {
      updateData.status = input.status;
      actions.push(`status → ${input.status}`);
    }
    if (input.subject !== undefined) {
      updateData.subject = input.subject;
      actions.push(`subject updated`);
    }
    if (input.inboxId !== undefined) {
      updateData.inbox_id = input.inboxId;
      actions.push(`moved to inbox`);
    }

    if (Object.keys(updateData).length > 0) {
      await client.updateConversation(input.conversationId, updateData);
    }

    if (input.assigneeId !== undefined) {
      await client.updateConversationAssignee(input.conversationId, input.assigneeId);
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

    if (input.addFollowerIds && input.addFollowerIds.length > 0) {
      await client.addConversationFollowers(input.conversationId, input.addFollowerIds);
      actions.push(`added ${input.addFollowerIds.length} follower(s)`);
    }

    if (input.removeFollowerIds && input.removeFollowerIds.length > 0) {
      await client.removeConversationFollowers(input.conversationId, input.removeFollowerIds);
      actions.push(`removed ${input.removeFollowerIds.length} follower(s)`);
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
