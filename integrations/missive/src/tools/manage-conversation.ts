import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageConversation = SlateTool.create(spec, {
  name: 'Manage Conversation',
  key: 'manage_conversation',
  description: `Update a conversation's state: close, reopen, move to inbox, assign to users/team, add or remove labels, or merge with another conversation.
Uses posts under the hood, which leave a visible trace in the conversation history.`,
  instructions: [
    'This tool creates a post to apply state changes — it will appear in the conversation timeline.',
    'To merge conversations, provide the mergeTargetConversationId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('Conversation ID to manage'),
      close: z.boolean().optional().describe('Close the conversation'),
      addToInbox: z.boolean().optional().describe('Move conversation to inbox (reopen)'),
      addToTeamInbox: z.boolean().optional().describe('Move to team inbox'),
      teamId: z.string().optional().describe('Team ID to assign to'),
      forceTeam: z
        .boolean()
        .optional()
        .describe('Force team reassignment even if already in another team'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID (required for user/assignee operations)'),
      addAssignees: z.array(z.string()).optional().describe('User IDs to assign'),
      addUsers: z.array(z.string()).optional().describe('User IDs to grant access'),
      addSharedLabels: z.array(z.string()).optional().describe('Shared label IDs to add'),
      removeSharedLabels: z
        .array(z.string())
        .optional()
        .describe('Shared label IDs to remove'),
      mergeTargetConversationId: z
        .string()
        .optional()
        .describe('Target conversation ID to merge into'),
      mergeSubject: z.string().optional().describe('New subject for the merged conversation')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Affected conversation ID'),
      postId: z.string().optional().describe('Post ID created for the state change'),
      merged: z.boolean().optional().describe('Whether a merge was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let actions: string[] = [];

    if (ctx.input.mergeTargetConversationId) {
      await client.mergeConversations(
        ctx.input.conversationId,
        ctx.input.mergeTargetConversationId,
        ctx.input.mergeSubject
      );
      actions.push('merged');
      return {
        output: {
          conversationId: ctx.input.mergeTargetConversationId,
          merged: true
        },
        message: `Merged conversation **${ctx.input.conversationId}** into **${ctx.input.mergeTargetConversationId}**.`
      };
    }

    let post: Record<string, any> = {
      conversation: ctx.input.conversationId,
      text: ''
    };

    if (ctx.input.close !== undefined) {
      post.close = ctx.input.close;
      actions.push('closed');
    }
    if (ctx.input.addToInbox !== undefined) {
      post.add_to_inbox = ctx.input.addToInbox;
      actions.push('moved to inbox');
    }
    if (ctx.input.addToTeamInbox !== undefined) {
      post.add_to_team_inbox = ctx.input.addToTeamInbox;
      actions.push('moved to team inbox');
    }
    if (ctx.input.teamId) {
      post.team = ctx.input.teamId;
      actions.push('assigned to team');
    }
    if (ctx.input.forceTeam !== undefined) post.force_team = ctx.input.forceTeam;
    if (ctx.input.organizationId) post.organization = ctx.input.organizationId;
    if (ctx.input.addAssignees) {
      post.add_assignees = ctx.input.addAssignees;
      actions.push('assigned users');
    }
    if (ctx.input.addUsers) {
      post.add_users = ctx.input.addUsers;
      actions.push('added users');
    }
    if (ctx.input.addSharedLabels) {
      post.add_shared_labels = ctx.input.addSharedLabels;
      actions.push('added labels');
    }
    if (ctx.input.removeSharedLabels) {
      post.remove_shared_labels = ctx.input.removeSharedLabels;
      actions.push('removed labels');
    }

    let data = await client.createPost(post);

    return {
      output: {
        conversationId: ctx.input.conversationId,
        postId: data.posts?.id,
        merged: false
      },
      message: `Updated conversation **${ctx.input.conversationId}**: ${actions.join(', ') || 'no changes'}.`
    };
  })
  .build();
