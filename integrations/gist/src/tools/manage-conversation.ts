import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let manageConversation = SlateTool.create(spec, {
  name: 'Manage Conversation',
  key: 'manage_conversation',
  description: `Perform actions on a Gist conversation: assign/unassign, close, snooze/unsnooze, prioritize, or tag/untag. Use this to manage conversation state and routing.`,
  instructions: [
    'Only one action can be performed per invocation. Choose the appropriate action field.'
  ]
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation'),
      action: z
        .enum([
          'assign',
          'unassign',
          'close',
          'snooze',
          'unsnooze',
          'prioritize',
          'tag',
          'untag'
        ])
        .describe('Action to perform'),
      assigneeId: z
        .string()
        .optional()
        .describe('Teammate ID to assign to (for "assign" action)'),
      teamId: z.string().optional().describe('Team ID to assign to (for "assign" action)'),
      snoozedUntil: z
        .string()
        .optional()
        .describe('UNIX timestamp to snooze until (for "snooze" action)'),
      priority: z
        .enum(['low', 'medium', 'high', 'urgent'])
        .optional()
        .describe('Priority level (for "prioritize" action)'),
      tagName: z.string().optional().describe('Tag name (for "tag" or "untag" action)')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Conversation ID'),
      actionPerformed: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });
    let { conversationId, action } = ctx.input;

    switch (action) {
      case 'assign': {
        let assignData: Record<string, any> = {};
        if (ctx.input.assigneeId) assignData.assignee_id = ctx.input.assigneeId;
        if (ctx.input.teamId) assignData.team_id = ctx.input.teamId;
        await client.assignConversation(conversationId, assignData);
        break;
      }
      case 'unassign':
        await client.unassignConversation(conversationId);
        break;
      case 'close':
        await client.closeConversation(conversationId);
        break;
      case 'snooze':
        await client.snoozeConversation(conversationId, {
          snoozed_until: ctx.input.snoozedUntil
        });
        break;
      case 'unsnooze':
        await client.unsnoozeConversation(conversationId);
        break;
      case 'prioritize':
        await client.prioritizeConversation(conversationId, { priority: ctx.input.priority });
        break;
      case 'tag':
        if (!ctx.input.tagName) throw new Error('tagName is required for tag action');
        await client.tagConversation(conversationId, ctx.input.tagName);
        break;
      case 'untag':
        if (!ctx.input.tagName) throw new Error('tagName is required for untag action');
        await client.untagConversation(conversationId, ctx.input.tagName);
        break;
    }

    return {
      output: {
        conversationId,
        actionPerformed: action
      },
      message: `Action **${action}** performed on conversation **${conversationId}**.`
    };
  })
  .build();
